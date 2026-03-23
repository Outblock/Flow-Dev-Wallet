/**
 * Announce Flow Dev Wallet via EIP-6963 for auto-discovery.
 *
 * Usage:
 *   import { announceFlowDevWallet } from '@outblock/flow-dev-wallet-sdk'
 *   announceFlowDevWallet({ walletUrl: 'http://localhost:3003/connect/popup' })
 */

import { createFlowDevWalletProvider, type FlowDevWalletConfig } from "./provider"

const ICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#181818"/><path d="M43.3 61.7c0 1-.3 2-.8 2.8-.6.8-1.3 1.4-2.3 1.8s-2 .5-3 .3-1.9-.7-2.5-1.4c-.7-.7-1.2-1.6-1.4-2.6s-.1-2 .3-2.9.9-1.7 1.7-2.2 1.7-.8 2.7-.8h5v-13.3h-5c-3.6 0-7.2 1.1-10.2 3.1s-5.4 4.9-6.8 8.2-1.7 7 -1 10.6 2.5 6.8 5 9.4 5.8 4.3 9.4 5 7 .3 10.3-1.1 6.2-3.7 8.2-6.8 3.1-6.5 3.1-10.2v-5h-13.3v5z" fill="#FF7964"/><rect x="43.3" y="43.3" width="13.3" height="13.3" fill="#FFEF6A"/><path d="M56.6 38.3c0-1 .3-2 .8-2.8s1.3-1.4 2.2-1.8 2-.5 3-.3 1.9.7 2.6 1.4 1.2 1.6 1.4 2.6.1 2-.3 2.9-.9 1.7-1.7 2.2-1.7.8-2.7.8h-5v13.3h5c3.6 0 7.2-1.1 10.2-3.1s5.4-4.9 6.8-8.2 1.7-7 1-10.6-2.5-6.8-5-9.4-5.8-4.3-9.4-5-7-.3-10.3 1.1-6.2 3.7-8.2 6.8-3.1 6.5-3.1 10.2v5h13.3v-5z" fill="#FF7964"/></svg>'
)}`

export function announceFlowDevWallet(config: FlowDevWalletConfig = {}) {
  if (typeof window === "undefined") return

  const provider = createFlowDevWalletProvider(config)

  const info = {
    uuid: "flow-dev-wallet-eip6963",
    name: "Flow Dev Wallet",
    icon: ICON_SVG,
    rdns: "com.outblock.flow-dev-wallet",
  }

  function announce() {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({ info, provider }),
      }),
    )
  }

  announce()
  window.addEventListener("eip6963:requestProvider", announce)

  return provider
}
