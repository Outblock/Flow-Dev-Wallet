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
| **Auto-Sign** | Automatically approve all signing requests — ideal for e2e tests |
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
| `host` | Wallet host URL | No (default: `http://localhost:3003`) |

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

- **Next.js 13** with NextUI + Tailwind CSS
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
| Private Key | LocalSigner (P256) | EOA direct derivation | P256 / SHA256 |

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

The wallet exposes an EIP-1193 provider via a popup window at `/connect/popup`.

Supported EVM methods:
- `eth_requestAccounts` — connect wallet
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

### Running wallet tests

```bash
bun playwright test
```

Tests are in the `e2e/` directory and use Playwright. The test suite covers:
- Wallet creation (private key, seed phrase)
- Wallet import
- Settings page functionality

### Using as a test wallet for your dApp

Flow Dev Wallet is designed to be used as an automated test wallet in your dApp's e2e test suite.

**1. Start the wallet:**
```bash
cd /path/to/flow-dev-wallet && bun run dev -p 3003
```

**2. In your Playwright test:**
```javascript
const { test, expect } = require('@playwright/test');

test('dApp flow', async ({ context }) => {
  // Pre-configure wallet with a test key and auto-sign
  const walletPage = await context.newPage();
  await walletPage.goto(
    'http://localhost:3003?seed=<your-test-private-key>&network=testnet&autoSign=true'
  );
  await walletPage.waitForTimeout(2000);

  // Now test your dApp — all wallet popups auto-approve
  const page = await context.newPage();
  await page.goto('http://localhost:3002'); // your dApp
  // ... connect, sign, transact — all automatic
});
```

**3. Or inject wallet state directly via localStorage:**
```javascript
const { injectTestWallet } = require('./e2e/helpers');

// After navigating to wallet page
await injectTestWallet(page);
```

### Auto-Sign Mode

When enabled (via Settings page, URL param `?autoSign=true`, or localStorage), the wallet automatically approves:
- FCL authentication (authn) — popup auto-closes
- FCL transaction signing (authz) — popup auto-closes
- FCL message signing (userSign) — popup auto-closes
- EVM transaction signing (eth_sendTransaction)
- EVM message signing (personal_sign, eth_signTypedData_v4)

FCL popups auto-close after approval. The EVM popup stays open for ongoing RPC communication.

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
  sign/SignCard.js       # Wallet creation UI (passkey, seed, private key)
  WalletCard.js          # Main wallet display card
  Connect.js             # Connection status component
utils/
  passkey.js             # FLIP-264 WebAuthn passkey operations
  sign.js                # Unified signing (passkey + local key)
  evm.js                 # EVM address derivation and chain config
  config.js              # FCL configuration helper
  flowindex.js           # FlowIndex API client (tokens, NFTs, balances)
  constants.js           # Key types, sign algorithms, hash algorithms
e2e/                    # Playwright e2e tests
  helpers.js             # Test utilities and constants
  wallet.spec.js         # Wallet core tests
  fcl-dapp.spec.js       # FCL dApp integration tests
  evm-dapp.spec.js       # EVM dApp integration tests
```

## Development

```bash
bun run dev        # Start dev server (default port 3000, use -p 3003 for tests)
bun run build      # Production build
bun run start      # Start production server
bun run lint       # Run ESLint
bun playwright test  # Run e2e tests
```
