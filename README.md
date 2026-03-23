# Flow Dev Wallet

A development wallet for the Flow blockchain supporting both Cadence and EVM. Build, test, and iterate on Flow dApps with real signing — not mocks.

## Overview

Flow Dev Wallet is a multi-signer wallet designed for Flow developers. It supports **passkey (FLIP-264)**, **seed phrase (BIP-39)**, and **private key** authentication, with dual-chain support for both Flow Cadence and Flow EVM. It implements the FCL wallet protocol for Cadence dApps and an EIP-1193 provider for EVM dApps (wagmi/RainbowKit compatible).

Key capabilities:
- Real WebAuthn passkey signing via FLIP-264
- Seed phrase and private key wallets with EVM EOA derivation
- Auto-sign mode for automated e2e testing
- URL parameter configuration for CI/CD pipelines
- FCL discovery wallet (authn, authz, user-signature, pre-authz, account-proof)
- EIP-1193 popup provider for EVM dApps
- FlowIndex API integration for token/NFT display
- Flow emulator support

## Features

| Feature | Description |
|---------|-------------|
| **FLIP-264 Passkey** | Real WebAuthn signing with `@flowindex/flow-passkey` — not entropy-based |
| **Seed Phrase** | BIP-39 mnemonic generation with secp256k1 signing via `@flowindex/flow-signer` |
| **Private Key** | P256 key pair generation and direct signing |
| **EVM Support** | EOA address derivation from private key (`m/44'/60'` for mnemonics) via viem |
| **FCL Protocol** | Full wallet services: authn, authz, user-signature, pre-authz, account-proof |
| **EIP-1193 Provider** | `eth_requestAccounts`, `personal_sign`, `eth_sendTransaction`, `eth_signTypedData_v4` |
| **Auto-Sign** | Secure auto-approve with double opt-in, origin whitelist, and passkey guard |
| **Saved Accounts** | Encrypted local key storage (AES-GCM-256) with quick-switch between accounts |
| **SDK Package** | [`@outblock/flow-dev-wallet-sdk`](https://www.npmjs.com/package/@outblock/flow-dev-wallet-sdk) — one-line RainbowKit integration |
| **URL Params** | Pre-configure wallet via query parameters for automation |
| **Settings Page** | Network selector, custom RPC endpoint, auto-sign toggle |
| **FlowIndex API** | Token and NFT display for both Flow and EVM addresses |
| **Emulator** | Full emulator support with local account creation |

## Quick Start

```bash
bun install
cp .env.example .env   # configure API key and payer account
bun run dev             # starts on http://localhost:3003
```

Open [http://localhost:3003](http://localhost:3003) to create or import a wallet.

**Hosted version:** [https://dev-wallet.flowindex.io](https://dev-wallet.flowindex.io)

## Configuration

### Environment Variables (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `apikey` | Lilico API key for account creation (server-side only) | Yes (testnet/mainnet) |
| `network` | Default network: `testnet`, `mainnet`, or `emulator` | No (default: `testnet`) |
| `payerPrivateKey` | Payer service account private key (P256 hex) | For pre-authz payer |
| `payerAddress` | Payer service account Flow address | For pre-authz payer |
| `payerKeyIndex` | Payer service account key index | For pre-authz payer |
| `emulatorPrivateKey` | Emulator service account private key | For emulator |
| `emulatorServiceAddress` | Emulator service account address | For emulator (default: `0xf8d6e0586b0a20c7`) |
| `emulatorAddress` | Emulator access node URL | No (default: `http://localhost:8888`) |
| `flowindexUrl` | FlowIndex API base URL | No (default: `https://flowindex.io/api`) |
| `host` | Wallet host URL | No (default: `http://localhost:3003`, prod: `https://dev-wallet.flowindex.io`) |

### Settings Page

Navigate to `/settings` to configure:
- **Network** — switch between mainnet, testnet, and emulator
- **Access Node RPC** — custom RPC endpoint (with reset to default)
- **Auto-Sign** — toggle automatic approval of all signing requests

### URL Parameters (for automation)

| Parameter | Description | Example |
|-----------|-------------|---------|
| `seed` | Auto-import a hex private key | `?seed=abc123...` |
| `network` | Set network | `?network=testnet` |
| `autoSign` | Enable auto-sign mode | `?autoSign=true` |

Combined example:
```
http://localhost:3003?seed=a3f563dd0926199530ab89d35760009b7384a2f41ce4faaf663dc47e3c42c642&network=testnet&autoSign=true
```

## Architecture

- **Next.js 16** with shadcn/ui + Tailwind CSS + Turbopack
- **@flowindex/flow-passkey** — FLIP-264 WebAuthn credential creation and signing
- **@flowindex/flow-signer** — Unified `LocalSigner` abstraction for key-based signing
- **@onflow/fcl** — Flow Client Library for wallet protocol
- **viem** — EVM interactions and EOA address derivation
- **Bun** runtime

## Wallet Types

| Type | Flow Signing | EVM Side | Key Algorithm |
|------|-------------|----------|---------------|
| Passkey | FLIP-264 WebAuthn | (ERC-4337 planned) | P256 / SHA256 |
| Seed Phrase | LocalSigner (secp256k1) | EOA via `m/44'/60'` | secp256k1 / SHA256 |
| Private Key | LocalSigner (configurable) | EOA direct derivation | secp256k1 / SHA256 (default) |

## DApp Integration

### FCL DApps (Flow Cadence)

Configure your dApp's FCL to use the dev wallet as the discovery wallet:

```javascript
import * as fcl from "@onflow/fcl";

fcl.config()
  .put("discovery.wallet", "http://localhost:3003/authn")
  .put("accessNode.api", "https://rest-testnet.onflow.org")
  .put("flow.network", "testnet");
```

Supported FCL services:
- **authn** — authenticate and connect wallet (`/authn`)
- **authz** — sign transactions (`/authz`)
- **user-signature** — sign arbitrary messages (`/userSign`)
- **pre-authz** — pre-authorization with payer service (`/api/preAuthz`)
- **account-proof** — prove account ownership on connect

### EVM DApps (wagmi/RainbowKit)

Install the SDK:

```bash
npm install @outblock/flow-dev-wallet-sdk
```

Add to your RainbowKit config:

```typescript
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { flowDevWallet } from "@outblock/flow-dev-wallet-sdk/rainbowkit";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        flowDevWallet(), // defaults to https://dev-wallet.flowindex.io/connect/popup
        // Or use local: flowDevWallet({ walletUrl: "http://localhost:3003/connect/popup" })
        // ... other wallets
      ],
    },
  ],
  { appName: "My App", projectId: "YOUR_WALLETCONNECT_PROJECT_ID" }
);
```

Use with wagmi config:

```typescript
import { createConfig, http } from "@wagmi/core";
import { flowTestnet, flowMainnet } from "@wagmi/core/chains";

export const config = createConfig({
  connectors,
  chains: [flowTestnet, flowMainnet],
  transports: {
    [flowTestnet.id]: http(),
    [flowMainnet.id]: http(),
  },
});
```

Or use the provider directly (without RainbowKit):

```typescript
import { createFlowDevWalletProvider } from "@outblock/flow-dev-wallet-sdk";

const provider = createFlowDevWalletProvider();
const accounts = await provider.request({ method: "eth_requestAccounts" });
```

Or auto-announce via EIP-6963:

```typescript
import { announceFlowDevWallet } from "@outblock/flow-dev-wallet-sdk";
announceFlowDevWallet(); // wallets supporting EIP-6963 will auto-detect it
```

**How it works:**
1. User clicks "Flow Dev Wallet" in RainbowKit → popup opens at `/connect/popup`
2. User approves connection → popup sends address via `postMessage` and closes
3. dApp calls `personal_sign` / `eth_sendTransaction` → popup re-opens for signing approval
4. With auto-sign enabled, all approvals are automatic (popup opens and closes instantly)

Supported EVM methods:
- `eth_requestAccounts` — connect wallet (popup with approval UI)
- `personal_sign` — sign messages
- `eth_sendTransaction` — send transactions
- `eth_signTypedData_v4` — sign typed data
- Read-only methods are proxied to the Flow EVM RPC

EVM chain configuration:

| Network | Chain ID | RPC |
|---------|----------|-----|
| Mainnet | 747 | `https://mainnet.evm.nodes.onflow.org` |
| Testnet | 545 | `https://testnet.evm.nodes.onflow.org` |
| Emulator | 646 | `http://localhost:8545` |

## E2E Testing

### Running all tests

```bash
npx playwright test
```

The test suite (8 tests) covers:
- **Wallet core** — create with private key, create with seed phrase, import, settings
- **FCL dApp** — connect via URL params (auto-sign), connect with manual approval
- **EVM dApp** — connect via URL params (auto-sign), connect with manual approval

Tests expect three servers (auto-started by Playwright config, or reuse existing):

| Server | Port | Project |
|--------|------|---------|
| Flow Dev Wallet | 3003 | This project |
| FCL Harness dApp | 3002 | `fcl-next-harness` |
| EVM Rainbow dApp | 3004 | `flow-evm-rainbow` |

### Using as a test wallet for your dApp

Flow Dev Wallet is designed to be used as an automated test wallet in your dApp's e2e test suite.

**1. Start the wallet:**
```bash
cd /path/to/flow-dev-wallet && bun run dev -p 3003
```

**2. For FCL dApps — Playwright example:**
```javascript
const { test, expect } = require('@playwright/test');

test('FCL dApp flow', async ({ context }) => {
  // Pre-configure wallet with a test key and auto-sign
  const walletPage = await context.newPage();
  await walletPage.goto(
    'http://localhost:3003?seed=<your-test-private-key>&network=testnet&autoSign=true'
  );
  // Wait for wallet to configure from URL params
  await walletPage.waitForFunction(() => {
    const raw = localStorage.getItem('store');
    return raw && JSON.parse(raw).keyInfo?.pk;
  }, { timeout: 8000 });

  // Now test your dApp — all wallet popups auto-approve and auto-close
  const page = await context.newPage();
  await page.goto('http://localhost:3002'); // your FCL dApp
  // ... fcl.authenticate(), fcl.mutate() — all automatic
});
```

**3. For EVM dApps (wagmi/RainbowKit) — Playwright example:**
```javascript
test('EVM dApp flow', async ({ context }) => {
  // Pre-configure wallet
  const walletPage = await context.newPage();
  await walletPage.goto(
    'http://localhost:3003?seed=<your-test-private-key>&network=testnet&autoSign=true'
  );
  await walletPage.waitForFunction(() => {
    const raw = localStorage.getItem('store');
    return raw && JSON.parse(raw).keyInfo?.pk;
  }, { timeout: 8000 });

  // Navigate to your EVM dApp
  const page = await context.newPage();
  await page.goto('http://localhost:3004');

  // Click "Flow Dev Wallet" in RainbowKit to connect
  // With auto-sign, the popup opens, approves, and closes automatically
  // Signing requests (personal_sign, eth_sendTransaction) also auto-approve
});
```

**4. Or inject wallet state directly via localStorage:**
```javascript
await page.goto('http://localhost:3003');
await page.evaluate(() => {
  localStorage.setItem('store', JSON.stringify({
    address: '0x631e88ae7f1d7c20',
    network: 'testnet',
    autoSign: true,
    keyInfo: {
      type: 'PrivateKey',
      pk: '<your-test-private-key>',
      pubK: '<corresponding-public-key>',
      keyIndex: 0,
      signAlgo: 'ECDSA_secp256k1',
      hashAlgo: 'SHA2_256',
      evmAddress: '0x...',
    },
  }));
});
```

### Auto-Sign Mode

Auto-sign requires **all** of the following to be active:

| Condition | Description |
|-----------|-------------|
| Settings toggle ON | User must manually enable in `/settings` |
| URL param `?autoSign=true` | Must be present in the session URL (valid for 24h) |
| Origin whitelist | Only dApps from whitelisted origins are auto-signed |
| Non-passkey wallet | Passkey wallets cannot auto-sign (WebAuthn requires user gesture) |

**Default whitelist:** `localhost`, `127.0.0.1` (configurable in Settings).

A red warning banner is displayed globally when auto-sign is active.

When all conditions are met, the wallet automatically approves:
- FCL authentication (authn) — popup auto-approves and auto-closes
- FCL transaction signing (authz) — popup auto-approves and auto-closes
- FCL message signing (userSign) — popup auto-approves and auto-closes
- EVM connection (eth_requestAccounts) — popup auto-approves and auto-closes
- EVM transaction signing (eth_sendTransaction) — popup auto-approves and auto-closes
- EVM message signing (personal_sign, eth_signTypedData_v4) — popup auto-approves and auto-closes

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/createAddress` | Create a Flow account (uses Lilico API or emulator) |
| GET | `/api/getAddressByIndexer` | Look up Flow address by public key (FlowIndex + legacy fallback) |
| GET | `/api/preAuthz` | FCL pre-authorization response |
| POST | `/api/signAsPayer` | Sign transaction envelope as payer service account |

## Project Structure

```
pages/
  index.js              # Main wallet UI (create/import/view)
  _app.js               # App wrapper with StoreContext, FCL config
  authn/index.js         # FCL authentication popup
  authz/index.js         # FCL transaction signing popup
  userSign/index.js      # FCL message signing popup
  connect/popup.js       # EVM EIP-1193 popup provider
  settings/index.js      # Network, RPC, auto-sign settings
  import/               # Wallet import (seed phrase, private key, JSON)
  api/                  # Server-side API routes
components/
  sign/SignCard.js       # Wallet creation UI (passkey, seed, private key) + saved accounts
  sign/ProgressBar.js    # Account creation progress with tx polling
  WalletCard.js          # Main wallet display card
  Connect.js             # Connection status component
  token/                 # Token and NFT display components
  activity/              # Transaction activity display
  setting/               # Settings UI
utils/
  passkey.js             # FLIP-264 WebAuthn passkey operations
  sign.js                # Unified signing (passkey + local key)
  evm.js                 # EVM address derivation and chain config
  evmSigner.js           # EVM RPC handler (eth_sendTransaction, personal_sign, etc.)
  keyManager.js          # Key generation and derivation service
  accountManager.js      # Flow account creation service
  config.js              # FCL configuration helper
  flowindex.js           # FlowIndex API client (tokens, NFTs, balances)
  crypto.js              # AES-GCM encryption for local key storage
  autoSign.js            # Auto-sign security: double opt-in, origin whitelist, passkey guard
  constants.js           # Key types, sign algorithms, hash algorithms
packages/
  sdk/                   # @outblock/flow-dev-wallet-sdk npm package
    src/provider.ts      # EIP-1193 provider (popup + postMessage)
    src/rainbowkit.ts    # RainbowKit custom wallet adapter
    src/announce.ts      # EIP-6963 auto-discovery
e2e/                    # Playwright e2e tests
  helpers.js             # Test utilities and constants
  wallet.spec.js         # Wallet core tests
  fcl-dapp.spec.js       # FCL dApp integration tests
  evm-dapp.spec.js       # EVM dApp integration tests
```

## Development

```bash
bun run dev            # Start dev server (default port 3000, use -p 3003 for tests)
bun run build          # Production build
bun run start          # Start production server
bun run lint           # Run ESLint
npx playwright test    # Run e2e tests (8 tests: wallet, FCL dApp, EVM dApp)
```
