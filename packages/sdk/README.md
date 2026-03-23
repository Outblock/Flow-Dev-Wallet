# @outblock/flow-dev-wallet-sdk

SDK for integrating [Flow Dev Wallet](https://github.com/Outblock/Flow-Dev-Wallet) into EVM dApps. Provides an EIP-1193 provider and RainbowKit adapter.

## Install

```bash
npm install @outblock/flow-dev-wallet-sdk
# or
bun add @outblock/flow-dev-wallet-sdk
```

## RainbowKit Integration

```typescript
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { flowDevWallet } from "@outblock/flow-dev-wallet-sdk/rainbowkit";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Dev",
      wallets: [
        flowDevWallet({ walletUrl: "http://localhost:3003/connect/popup" }),
      ],
    },
  ],
  { appName: "My App", projectId: "YOUR_PROJECT_ID" }
);
```

## Direct Provider (without RainbowKit)

```typescript
import { createFlowDevWalletProvider } from "@outblock/flow-dev-wallet-sdk";

const provider = createFlowDevWalletProvider({
  walletUrl: "http://localhost:3003/connect/popup",
});

// Connect
const accounts = await provider.request({ method: "eth_requestAccounts" });

// Sign message
const sig = await provider.request({
  method: "personal_sign",
  params: ["0x48656c6c6f", accounts[0]],
});

// Send transaction
const txHash = await provider.request({
  method: "eth_sendTransaction",
  params: [{ from: accounts[0], to: "0x...", value: "0x0" }],
});
```

## EIP-6963 Auto-Discovery

```typescript
import { announceFlowDevWallet } from "@outblock/flow-dev-wallet-sdk";

// Call once at app startup — wallets supporting EIP-6963 will auto-detect it
announceFlowDevWallet({ walletUrl: "http://localhost:3003/connect/popup" });
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
| `eth_chainId` | Get chain ID |
| `personal_sign` | Sign a message |
| `eth_sendTransaction` | Send a transaction |
| `eth_signTypedData_v4` | Sign EIP-712 typed data |
| Other methods | Proxied to the wallet popup |

## Requirements

- Flow Dev Wallet running at the configured URL (default: `http://localhost:3003`)
- `wagmi >= 2.0.0` (peer dependency, required for RainbowKit adapter)
