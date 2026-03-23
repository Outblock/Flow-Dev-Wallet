# @outblock/flow-dev-wallet-sdk

SDK for integrating [Flow Dev Wallet](https://github.com/Outblock/Flow-Dev-Wallet) into EVM dApps. Provides an EIP-1193 provider, RainbowKit adapter, and EIP-6963 auto-discovery.

**Hosted wallet:** [https://dev-wallet.flowindex.io](https://dev-wallet.flowindex.io)

## Install

```bash
npm install @outblock/flow-dev-wallet-sdk
# or
pnpm add @outblock/flow-dev-wallet-sdk
```

## RainbowKit Integration

```typescript
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { flowDevWallet } from "@outblock/flow-dev-wallet-sdk/rainbowkit";
import { createConfig, http } from "@wagmi/core";
import { flowTestnet, flowMainnet } from "@wagmi/core/chains";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        flowDevWallet(), // uses hosted wallet by default
        // Or local: flowDevWallet({ walletUrl: "http://localhost:3003/connect/popup" })
      ],
    },
  ],
  { appName: "My App", projectId: "YOUR_WALLETCONNECT_PROJECT_ID" }
);

export const config = createConfig({
  connectors,
  chains: [flowTestnet, flowMainnet],
  transports: {
    [flowTestnet.id]: http(),
    [flowMainnet.id]: http(),
  },
});
```

## Direct EIP-1193 Provider (without RainbowKit)

Works with any EIP-1193 compatible library (ethers.js, web3.js, viem, etc.):

```typescript
import { createFlowDevWalletProvider } from "@outblock/flow-dev-wallet-sdk";

const provider = createFlowDevWalletProvider();
// Or with custom URL:
// const provider = createFlowDevWalletProvider({ walletUrl: "http://localhost:3003/connect/popup" });

// Connect — opens wallet popup for user approval
const accounts = await provider.request({ method: "eth_requestAccounts" });
console.log("Connected:", accounts[0]);

// Sign message
const signature = await provider.request({
  method: "personal_sign",
  params: ["0x48656c6c6f", accounts[0]],
});

// Send transaction
const txHash = await provider.request({
  method: "eth_sendTransaction",
  params: [{ from: accounts[0], to: "0x...", value: "0x0" }],
});

// Sign typed data (EIP-712)
const typedSig = await provider.request({
  method: "eth_signTypedData_v4",
  params: [accounts[0], JSON.stringify(typedData)],
});

// Disconnect
provider.disconnect();
```

### Using with ethers.js

```typescript
import { BrowserProvider } from "ethers";
import { createFlowDevWalletProvider } from "@outblock/flow-dev-wallet-sdk";

const eip1193 = createFlowDevWalletProvider();
const provider = new BrowserProvider(eip1193);
const signer = await provider.getSigner();
const tx = await signer.sendTransaction({ to: "0x...", value: 0n });
```

### Using with viem

```typescript
import { createWalletClient, custom } from "viem";
import { flowTestnet } from "viem/chains";
import { createFlowDevWalletProvider } from "@outblock/flow-dev-wallet-sdk";

const eip1193 = createFlowDevWalletProvider();
const client = createWalletClient({
  chain: flowTestnet,
  transport: custom(eip1193),
});
const [address] = await client.requestAddresses();
```

## EIP-6963 Auto-Discovery

Announce the wallet so any dApp supporting [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) auto-detects it:

```typescript
import { announceFlowDevWallet } from "@outblock/flow-dev-wallet-sdk";

// Call once at app startup
announceFlowDevWallet();
```

## How It Works

1. `eth_requestAccounts` opens a popup at the wallet URL
2. User approves the connection in the popup
3. Popup sends the EVM address back via `postMessage` and closes
4. Signing requests (`personal_sign`, `eth_sendTransaction`, etc.) re-open the popup
5. With auto-sign enabled on the wallet, all approvals happen automatically

## Supported Methods

| Method | Description |
|--------|-------------|
| `eth_requestAccounts` | Connect wallet (popup with approval) |
| `eth_accounts` | Get connected accounts |
| `eth_chainId` | Get chain ID (Flow EVM Testnet: 545, Mainnet: 747) |
| `personal_sign` | Sign a message |
| `eth_sendTransaction` | Send a transaction |
| `eth_signTypedData_v4` | Sign EIP-712 typed data |
| Other methods | Proxied to the wallet popup → Flow EVM RPC |

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `walletUrl` | `https://dev-wallet.flowindex.io/connect/popup` | Wallet popup URL |
| `popupFeatures` | `width=420,height=640,...` | `window.open` features string |

## Events

```typescript
provider.on("accountsChanged", (accounts) => { ... });
provider.on("chainChanged", (chainId) => { ... });
provider.on("connect", ({ chainId }) => { ... });
provider.on("disconnect", () => { ... });
```

## Requirements

- `wagmi >= 2.0.0` (peer dependency, only needed for RainbowKit adapter)
- Flow Dev Wallet running at the configured URL
