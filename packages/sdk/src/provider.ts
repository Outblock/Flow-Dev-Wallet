/**
 * Flow Dev Wallet — EIP-1193 Provider
 *
 * Communicates with the wallet via a popup window + postMessage.
 * Supports eth_requestAccounts, personal_sign, eth_sendTransaction,
 * eth_signTypedData_v4, and proxies read-only methods.
 */

export interface FlowDevWalletConfig {
  /** URL of the wallet popup endpoint. Default: http://localhost:3003/connect/popup */
  walletUrl?: string
  /** Popup window features string */
  popupFeatures?: string
}

type EventName = "accountsChanged" | "chainChanged" | "connect" | "disconnect"
type Handler = (...args: any[]) => void

interface PendingRequest {
  resolve: (value: any) => void
  reject: (error: any) => void
}

interface PersistedSession {
  connectedAddress: string
  chainId: number | null
}

const SIGNING_METHODS = new Set([
  "eth_sendTransaction",
  "eth_signTransaction",
  "personal_sign",
  "eth_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
])

export function createFlowDevWalletProvider(config: FlowDevWalletConfig = {}) {
  const {
    walletUrl = "https://dev-wallet.flowindex.io/connect/popup",
    popupFeatures = "width=420,height=640,left=100,top=100,scrollbars=yes",
  } = config

  let popup: Window | null = null
  const storageKey = getSessionStorageKey(walletUrl)
  const initialSession = readPersistedSession(storageKey)
  let connectedAddress: string | null = initialSession?.connectedAddress ?? null
  let chainId: number | null = initialSession?.chainId ?? null
  let popupReady = false
  let requestId = 0
  const pending = new Map<number, PendingRequest>()
  const listeners = new Map<EventName, Set<Handler>>()
  let connectWaiters: Array<{ resolve: (accounts: string[]) => void; reject: (error: Error) => void }> = []

  function emit(event: EventName, ...args: any[]) {
    listeners.get(event)?.forEach((fn) => fn(...args))
  }

  let readyResolvers: Array<() => void> = []

  function persistSession() {
    if (typeof window === "undefined") return
    if (!connectedAddress) {
      window.localStorage.removeItem(storageKey)
      return
    }
    const session: PersistedSession = { connectedAddress, chainId }
    window.localStorage.setItem(storageKey, JSON.stringify(session))
  }

  function resolveConnectWaiters(accounts: string[]) {
    const waiters = connectWaiters
    connectWaiters = []
    waiters.forEach(({ resolve }) => resolve(accounts))
  }

  function rejectConnectWaiters(error: Error) {
    const waiters = connectWaiters
    connectWaiters = []
    waiters.forEach(({ reject }) => reject(error))
  }

  function onMessage(event: MessageEvent) {
    const { data } = event
    if (!data?.type?.startsWith("flowindex_")) return

    if (data.type === "flowindex_ready") {
      popupReady = true
      if (data.address) {
        connectedAddress = data.address
        chainId = data.chainId
        persistSession()
      }
      const resolvers = readyResolvers
      readyResolvers = []
      resolvers.forEach((r) => r())
    }

    if (data.type === "flowindex_connected") {
      const address = data.address as string
      connectedAddress = address
      chainId = data.chainId
      popupReady = true
      persistSession()
      emit("connect", { chainId: `0x${chainId!.toString(16)}` })
      emit("accountsChanged", [address])
      resolveConnectWaiters([address])
      const resolvers = readyResolvers
      readyResolvers = []
      resolvers.forEach((r) => r())
    }

    if (data.type === "flowindex_disconnected") {
      connectedAddress = null
      chainId = null
      popupReady = false
      persistSession()
      rejectConnectWaiters(new Error("User rejected connection"))
      emit("disconnect", { code: 4900, message: "Disconnected" })
      emit("accountsChanged", [])
    }

    if (data.type === "flowindex_rpc_response") {
      const req = pending.get(data.id)
      if (!req) return
      pending.delete(data.id)
      if (data.error) {
        req.reject(data.error)
      } else {
        req.resolve(data.result)
      }
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("message", onMessage)
  }

  function openPopup(action?: string): Window {
    if (popup && !popup.closed) return popup
    popupReady = false
    const url = action ? `${walletUrl}?action=${action}` : walletUrl
    popup = window.open(url, "flow-dev-wallet", popupFeatures)
    if (!popup) throw new Error("Popup blocked. Please allow popups for this site.")
    return popup
  }

  function waitForReady(): Promise<void> {
    if (popupReady) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        readyResolvers = readyResolvers.filter((r) => r !== resolve)
        reject(new Error("Popup load timed out"))
      }, 30_000)
      readyResolvers.push(() => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  function sendRequest(method: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!popup || popup.closed) {
        reject(new Error("Wallet popup is closed"))
        return
      }
      const id = ++requestId
      pending.set(id, { resolve, reject })
      popup.postMessage({ type: "flowindex_rpc_request", id, method, params: params ?? [] }, "*")
    })
  }

  const provider = {
    isFlowDevWallet: true,
    isMetaMask: false,

    async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
      if (method === "eth_requestAccounts") {
        if (connectedAddress) return [connectedAddress]

        return new Promise<string[]>((resolve, reject) => {
          const waiter = {
            resolve: (accounts: string[]) => {
              clearTimeout(timeout)
              resolve(accounts)
            },
            reject: (error: Error) => {
              clearTimeout(timeout)
              reject(error)
            },
          }
          const timeout = setTimeout(() => {
            connectWaiters = connectWaiters.filter((candidate) => candidate !== waiter)
            reject(new Error("Connection timed out"))
          }, 120_000)

          connectWaiters.push(waiter)

          openPopup()
        })
      }

      if (method === "eth_accounts") {
        return connectedAddress ? [connectedAddress] : []
      }

      if (method === "eth_chainId") {
        return chainId ? `0x${chainId.toString(16)}` : "0x221" // default: 545 (Flow EVM Testnet)
      }

      if (SIGNING_METHODS.has(method)) {
        if (!connectedAddress) {
          throw new Error("Wallet not connected. Call eth_requestAccounts first.")
        }
        if (!popup || popup.closed) {
          openPopup("sign")
          await waitForReady()
        }
        return sendRequest(method, params)
      }

      if (!popup || popup.closed) {
        throw new Error("Wallet not connected")
      }
      return sendRequest(method, params)
    },

    on(event: EventName, handler: Handler) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    },

    removeListener(event: EventName, handler: Handler) {
      listeners.get(event)?.delete(handler)
    },

    disconnect() {
      connectedAddress = null
      chainId = null
      popupReady = false
      persistSession()
      if (popup && !popup.closed) popup.close()
      popup = null
      emit("disconnect", { code: 4900, message: "Disconnected" })
      emit("accountsChanged", [])
    },
  }

  return provider
}

export type FlowDevWalletProvider = ReturnType<typeof createFlowDevWalletProvider>

function getSessionStorageKey(walletUrl: string): string {
  const normalizedWalletUrl = typeof window !== "undefined"
    ? new URL(walletUrl, window.location.href).toString()
    : walletUrl
  return `flow-dev-wallet:session:${normalizedWalletUrl}`
}

function readPersistedSession(storageKey: string): PersistedSession | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedSession
    if (!parsed?.connectedAddress) return null
    return {
      connectedAddress: parsed.connectedAddress,
      chainId: typeof parsed.chainId === "number" ? parsed.chainId : null,
    }
  } catch {
    return null
  }
}
