/**
 * Smart Wallet (ERC-4337) service for Flow Dev Wallet.
 *
 * Uses @flowindex/evm-wallet for UserOperation building, signing, and bundler interaction.
 * Supports CoinbaseSmartWallet-compatible accounts with passkey or ECDSA owners.
 *
 * Note: We import from specific dist files to avoid pulling in the walletconnect dependency.
 */

import type { Address, Hex } from "viem";

// ─── Constants ──────────────────────────────────────────────────────
export const BUNDLER_URLS: Record<string, string> = {
  testnet: "https://testnet.evm.flowindex.io/bundler",
  mainnet: "https://evm.flowindex.io/bundler",
};

export const PAYMASTER_URLS: Record<string, string> = {
  testnet: "https://testnet.evm.flowindex.io/paymaster",
  mainnet: "https://evm.flowindex.io/paymaster",
};

function getRpcUrl(network: string): string {
  return network === "mainnet"
    ? "https://mainnet.evm.nodes.onflow.org"
    : "https://testnet.evm.nodes.onflow.org";
}

function getChainId(network: string): number {
  return network === "mainnet" ? 747 : 545;
}

// ─── Smart Wallet Address ───────────────────────────────────────────

export async function getSmartWalletAddress(
  publicKeySec1Hex: string,
  network: string = "testnet"
): Promise<Address> {
  const { getSmartWalletAddress: getAddr } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/factory.js"
  );
  return getAddr(publicKeySec1Hex, { rpcUrl: getRpcUrl(network) });
}

export async function isSmartWalletDeployed(
  address: Address,
  network: string = "testnet"
): Promise<boolean> {
  const { createPublicClient, http } = await import("viem");
  const client = createPublicClient({ transport: http(getRpcUrl(network)) });
  const code = await client.getCode({ address });
  return !!code && code !== "0x";
}

// ─── UserOperation Building ─────────────────────────────────────────

export interface SmartWalletTxParams {
  to: Address;
  value?: bigint;
  data?: Hex;
}

export async function buildSmartWalletUserOp(
  sender: Address,
  tx: SmartWalletTxParams | SmartWalletTxParams[],
  opts: {
    publicKeySec1Hex: string;
    isDeployed: boolean;
    network?: string;
    paymasterUrl?: string;
  }
): Promise<any> {
  const { buildUserOperation } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/user-op.js"
  );
  const { createBundlerClient } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/bundler-client.js"
  );
  const { ENTRYPOINT_V07_ADDRESS } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/constants.js"
  );

  const network = opts.network || "testnet";
  const bundlerUrl = BUNDLER_URLS[network] || BUNDLER_URLS.testnet;
  const bundlerClient = createBundlerClient(bundlerUrl);

  const calls = Array.isArray(tx) ? tx : [tx];
  const callParams = calls.map((t) => ({
    target: t.to,
    value: t.value || BigInt(0),
    data: (t.data || "0x") as Hex,
  }));

  return buildUserOperation({
    sender,
    call: callParams.length === 1 ? callParams[0] : callParams,
    publicKeySec1Hex: opts.publicKeySec1Hex,
    isDeployed: opts.isDeployed,
    rpcUrl: getRpcUrl(network),
    bundlerClient,
    entryPoint: ENTRYPOINT_V07_ADDRESS,
    paymasterUrl: opts.paymasterUrl || PAYMASTER_URLS[network],
  });
}

// ─── Signing ────────────────────────────────────────────────────────

export async function signUserOpWithPasskey(
  userOp: any,
  credentialId: string,
  network: string = "testnet"
): Promise<Hex> {
  const { computeUserOpHash } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/constants.js"
  );
  const { signUserOpWithPasskey: signWithPasskey } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/signer.js"
  );
  const { ENTRYPOINT_V07_ADDRESS } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/constants.js"
  );

  const userOpHash = computeUserOpHash(userOp, ENTRYPOINT_V07_ADDRESS, getChainId(network));
  return signWithPasskey(userOpHash, credentialId);
}

export async function signUserOpWithECDSA(
  userOp: any,
  privateKey: string,
  network: string = "testnet"
): Promise<Hex> {
  const { computeUserOpHash, ENTRYPOINT_V07_ADDRESS } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/constants.js"
  );
  const { privateKeyToAccount } = await import("viem/accounts");
  const { encodeAbiParameters } = await import("viem");

  const userOpHash = computeUserOpHash(userOp, ENTRYPOINT_V07_ADDRESS, getChainId(network));

  const pk = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex;
  const account = privateKeyToAccount(pk);
  const signature = await account.signMessage({ message: { raw: userOpHash } });

  // CoinbaseSmartWallet expects ownerIndex prepended
  return encodeAbiParameters(
    [{ type: "uint256" }, { type: "bytes" }],
    [BigInt(0), signature]
  ) as Hex;
}

// ─── Submit ─────────────────────────────────────────────────────────

export async function submitUserOp(
  userOp: any,
  network: string = "testnet"
): Promise<Hex> {
  const { createBundlerClient } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/bundler-client.js"
  );
  const { ENTRYPOINT_V07_ADDRESS } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/constants.js"
  );

  const bundlerUrl = BUNDLER_URLS[network] || BUNDLER_URLS.testnet;
  const bundlerClient = createBundlerClient(bundlerUrl);
  return bundlerClient.sendUserOperation(userOp, ENTRYPOINT_V07_ADDRESS);
}

export async function waitForUserOpReceipt(
  userOpHash: Hex,
  network: string = "testnet",
  timeoutMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<any> {
  const { createBundlerClient } = await import(
    /* webpackIgnore: true */
    "@flowindex/evm-wallet/dist/bundler-client.js"
  );

  const bundlerUrl = BUNDLER_URLS[network] || BUNDLER_URLS.testnet;
  const bundlerClient = createBundlerClient(bundlerUrl);

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const receipt = await bundlerClient.getUserOperationReceipt(userOpHash);
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`UserOp ${userOpHash} not mined within ${timeoutMs}ms`);
}

// ─── Full Send Flow ─────────────────────────────────────────────────

export async function sendSmartWalletTransaction(
  tx: SmartWalletTxParams | SmartWalletTxParams[],
  opts: {
    sender: Address;
    publicKeySec1Hex: string;
    isDeployed: boolean;
    network?: string;
    credentialId?: string;
    privateKey?: string;
  }
): Promise<Hex> {
  const network = opts.network || "testnet";

  const userOp = await buildSmartWalletUserOp(opts.sender, tx, {
    publicKeySec1Hex: opts.publicKeySec1Hex,
    isDeployed: opts.isDeployed,
    network,
  });

  if (opts.credentialId) {
    userOp.signature = await signUserOpWithPasskey(userOp, opts.credentialId, network);
  } else if (opts.privateKey) {
    userOp.signature = await signUserOpWithECDSA(userOp, opts.privateKey, network);
  } else {
    throw new Error("Must provide credentialId (passkey) or privateKey (ECDSA) for signing");
  }

  return submitUserOp(userOp, network);
}
