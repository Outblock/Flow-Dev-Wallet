/**
 * RainbowKit custom wallet adapter for Flow Dev Wallet.
 *
 * Usage:
 *   import { flowDevWallet } from '@outblock/flow-dev-wallet-sdk/rainbowkit'
 *
 *   const connectors = connectorsForWallets([{
 *     groupName: 'Dev',
 *     wallets: [flowDevWallet({ walletUrl: 'http://localhost:3003/connect/popup' })],
 *   }], { appName: 'My App', projectId: '...' })
 */

import { createConnector } from "wagmi"
import { createFlowDevWalletProvider, type FlowDevWalletConfig } from "./provider"

// Flow logo with dark background — matches the wallet's public/logo.svg
const ICON_SVG = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#181818"/><path d="M43.3 61.7c0 1-.3 2-.8 2.8-.6.8-1.3 1.4-2.3 1.8s-2 .5-3 .3-1.9-.7-2.5-1.4c-.7-.7-1.2-1.6-1.4-2.6s-.1-2 .3-2.9.9-1.7 1.7-2.2 1.7-.8 2.7-.8h5v-13.3h-5c-3.6 0-7.2 1.1-10.2 3.1s-5.4 4.9-6.8 8.2-1.7 7 -1 10.6 2.5 6.8 5 9.4 5.8 4.3 9.4 5 7 .3 10.3-1.1 6.2-3.7 8.2-6.8 3.1-6.5 3.1-10.2v-5h-13.3v5z" fill="#FF7964"/><rect x="43.3" y="43.3" width="13.3" height="13.3" fill="#FFEF6A"/><path d="M56.6 38.3c0-1 .3-2 .8-2.8s1.3-1.4 2.2-1.8 2-.5 3-.3 1.9.7 2.6 1.4 1.2 1.6 1.4 2.6.1 2-.3 2.9-.9 1.7-1.7 2.2-1.7.8-2.7.8h-5v13.3h5c3.6 0 7.2-1.1 10.2-3.1s5.4-4.9 6.8-8.2 1.7-7 1-10.6-2.5-6.8-5-9.4-5.8-4.3-9.4-5-7-.3-10.3 1.1-6.2 3.7-8.2 6.8-3.1 6.5-3.1 10.2v5h13.3v-5z" fill="#FF7964"/></svg>'
)

export interface FlowDevWalletOptions {
  walletUrl?: string
}

/**
 * Creates a Flow Dev Wallet definition for RainbowKit.
 * Returns a CreateWalletFn compatible with connectorsForWallets.
 */
export function flowDevWallet(options: FlowDevWalletOptions = {}): (params: any) => any {
  const walletUrl = options.walletUrl ?? "https://dev-wallet.flowindex.io/connect/popup"

  return function createWallet(_params: any): any {
    return {
      id: "flow-dev-wallet",
      name: "Flow Dev Wallet",
      iconUrl: ICON_SVG,
      iconBackground: "#00EF8B",
      installed: true,

      createConnector: (walletDetails: any) =>
        createFlowDevWalletConnector({ walletUrl }, walletDetails),
    }
  }
}

function createFlowDevWalletConnector(config: FlowDevWalletConfig, walletDetails: any = {}) {
  return createConnector((wagmiConfig) => {
    const provider = createFlowDevWalletProvider(config)
    let connected = false

    return {
      id: "flow-dev-wallet",
      name: "Flow Dev Wallet",
      type: "flow-dev-wallet" as const,
      ...walletDetails,

      async setup() {},

      async connect(_params?: { chainId?: number; isReconnecting?: boolean }) {
        const accounts = await provider.request({ method: "eth_requestAccounts" })
        const chainIdHex = await provider.request({ method: "eth_chainId" })
        connected = true
        return {
          accounts: accounts.map((a: string) => a as `0x${string}`),
          chainId: parseInt(chainIdHex, 16),
        }
      },

      async disconnect() {
        provider.disconnect()
        connected = false
      },

      async getAccounts() {
        const accounts = await provider.request({ method: "eth_accounts" })
        return accounts.map((a: string) => a as `0x${string}`)
      },

      async getChainId() {
        const hex = await provider.request({ method: "eth_chainId" })
        return parseInt(hex, 16)
      },

      async getProvider() {
        return provider as any
      },

      async isAuthorized() {
        try {
          const accounts = await provider.request({ method: "eth_accounts" })
          return accounts.length > 0
        } catch {
          return false
        }
      },

      async switchChain(_params: { chainId: number }) {
        throw new Error("Flow Dev Wallet only supports Flow EVM")
      },

      onAccountsChanged(accounts: string[]) {
        if (accounts.length === 0) {
          wagmiConfig.emitter.emit("disconnect")
        } else {
          wagmiConfig.emitter.emit("change", {
            accounts: accounts.map((a: string) => a as `0x${string}`),
          })
        }
      },

      onChainChanged(chainId: string) {
        wagmiConfig.emitter.emit("change", { chainId: parseInt(chainId, 16) })
      },

      onDisconnect() {
        connected = false
        wagmiConfig.emitter.emit("disconnect")
      },
    }
  })
}
