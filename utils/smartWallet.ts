/**
 * Smart Wallet (ERC-4337) service for Flow Dev Wallet.
 *
 * Implements CoinbaseSmartWallet-compatible account abstraction.
 * Inlines critical functions from @flowindex/evm-wallet to avoid ESM import issues.
 */

import {
  type Address,
  type Hex,
  createPublicClient,
  http,
  encodeAbiParameters,
  encodeFunctionData,
  concat,
  keccak256,
  pad,
  toHex,
} from "viem";

// ─── Constants ──────────────────────────────────────────────────────

export const ENTRYPOINT_V07: Address = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
export const FACTORY_ADDRESS: Address = "0xAc396ed9a5E949C685C3799657E26fE1d6fFf7E7";

export const BUNDLER_URLS: Record<string, string> = {
  testnet: "https://bundler.flowindex.io",
  mainnet: "https://bundler.flowindex.io",
};

export const PAYMASTER_URLS: Record<string, string> = {
  testnet: "https://bundler.flowindex.io/paymaster",
  mainnet: "https://bundler.flowindex.io/paymaster",
};

const FACTORY_ABI = [
  {
    name: "getAddress",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owners", type: "bytes[]" },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "createAccount",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "owners", type: "bytes[]" },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const SMART_WALLET_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "executeBatch",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

const ENTRYPOINT_ABI = [
  {
    name: "getNonce",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "sender", type: "address" },
      { name: "key", type: "uint192" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function getRpcUrl(network: string): string {
  return network === "mainnet"
    ? "https://mainnet.evm.nodes.onflow.org"
    : "https://testnet.evm.nodes.onflow.org";
}

function getChainId(network: string): number {
  return network === "mainnet" ? 747 : 545;
}

// ─── Factory helpers (inlined from @flowindex/evm-wallet) ───────────

function parsePublicKey(sec1Hex: string): { x: bigint; y: bigint } {
  const clean = sec1Hex.startsWith("0x") ? sec1Hex.slice(2) : sec1Hex;
  if (!clean.startsWith("04")) throw new Error("Expected uncompressed SEC1 public key (04 prefix)");
  if (clean.length !== 130) throw new Error(`Expected 130 hex chars, got ${clean.length}`);
  return {
    x: BigInt("0x" + clean.slice(2, 66)),
    y: BigInt("0x" + clean.slice(66, 130)),
  };
}

function encodeOwnerBytes(x: bigint, y: bigint): Hex {
  return encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [x, y]);
}

function buildOwners(sec1Hex: string): Hex[] {
  const { x, y } = parsePublicKey(sec1Hex);
  return [encodeOwnerBytes(x, y)];
}

function buildInitCode(sec1Hex: string, factoryAddress: Address = FACTORY_ADDRESS, nonce: bigint = BigInt(0)): Hex {
  const owners = buildOwners(sec1Hex);
  const callData = encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: "createAccount",
    args: [owners, nonce],
  });
  return concat([factoryAddress, callData]);
}

// ─── UserOp helpers (inlined) ───────────────────────────────────────

function packGasLimits(verificationGasLimit: bigint, callGasLimit: bigint): Hex {
  const vgl = pad(toHex(verificationGasLimit), { size: 16 });
  const cgl = pad(toHex(callGasLimit), { size: 16 });
  return concat([vgl, cgl]);
}

function packGasFees(maxPriorityFeePerGas: bigint, maxFeePerGas: bigint): Hex {
  const mpfpg = pad(toHex(maxPriorityFeePerGas), { size: 16 });
  const mfpg = pad(toHex(maxFeePerGas), { size: 16 });
  return concat([mpfpg, mfpg]);
}

export function computeUserOpHash(
  userOp: { sender: Address; nonce: Hex; initCode: Hex; callData: Hex; accountGasLimits: Hex; preVerificationGas: Hex; gasFees: Hex; paymasterAndData: Hex },
  entryPoint: Address,
  chainId: number
): Hex {
  const packed = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes32" }],
    [userOp.sender, BigInt(userOp.nonce), keccak256(userOp.initCode), keccak256(userOp.callData), userOp.accountGasLimits, BigInt(userOp.preVerificationGas), userOp.gasFees, keccak256(userOp.paymasterAndData)]
  );
  const innerHash = keccak256(packed);
  return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }, { type: "uint256" }], [innerHash, entryPoint, BigInt(chainId)]));
}

// ─── Bundler Client ─────────────────────────────────────────────────

function createBundlerClient(bundlerUrl: string) {
  async function rpc(method: string, params: any[]): Promise<any> {
    const res = await fetch(bundlerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.result;
  }
  return {
    sendUserOperation: (userOp: any, entryPoint: Address) => rpc("eth_sendUserOperation", [userOp, entryPoint]) as Promise<Hex>,
    estimateUserOperationGas: (userOp: any, entryPoint: Address) => rpc("eth_estimateUserOperationGas", [userOp, entryPoint]),
    getUserOperationReceipt: (hash: Hex) => rpc("eth_getUserOperationReceipt", [hash]),
  };
}

// ─── Smart Wallet Address ───────────────────────────────────────────

export async function getSmartWalletAddress(
  publicKeySec1Hex: string,
  network: string = "testnet"
): Promise<Address> {
  const owners = buildOwners(publicKeySec1Hex);
  const client = createPublicClient({ transport: http(getRpcUrl(network)) });
  const address = await client.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getAddress",
    args: [owners, BigInt(0)],
  });
  return address as Address;
}

export async function isSmartWalletDeployed(
  address: Address,
  network: string = "testnet"
): Promise<boolean> {
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
  const network = opts.network || "testnet";
  const rpcUrl = getRpcUrl(network);
  const bundlerUrl = BUNDLER_URLS[network] || BUNDLER_URLS.testnet;
  const bundlerClient = createBundlerClient(bundlerUrl);
  const client = createPublicClient({ transport: http(rpcUrl) });

  const calls = Array.isArray(tx) ? tx : [tx];
  const callParams = calls.map((t) => ({
    target: t.to,
    value: t.value || BigInt(0),
    data: (t.data || "0x") as Hex,
  }));

  // Get nonce
  const nonce = await client.readContract({
    address: ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: "getNonce",
    args: [sender, BigInt(0)],
  });

  const initCode: Hex = opts.isDeployed ? "0x" : buildInitCode(opts.publicKeySec1Hex);
  const callData: Hex = callParams.length === 1
    ? encodeFunctionData({ abi: SMART_WALLET_ABI, functionName: "execute", args: [callParams[0].target, callParams[0].value, callParams[0].data] })
    : encodeFunctionData({ abi: SMART_WALLET_ABI, functionName: "executeBatch", args: [callParams] });

  const dummySig = ("0x" + "ff".repeat(65)) as Hex;

  // Estimate gas
  const gasEstimate = await bundlerClient.estimateUserOperationGas({
    sender, nonce: toHex(nonce), initCode, callData, signature: dummySig,
    paymasterAndData: "0x", accountGasLimits: packGasLimits(BigInt(500000), BigInt(500000)),
    preVerificationGas: toHex(BigInt(100000)), gasFees: packGasFees(BigInt(0), BigInt(1000000)),
  }, ENTRYPOINT_V07);

  const block = await client.getBlock();
  const baseFee = block.baseFeePerGas ?? BigInt(1);
  const maxFeePerGas = baseFee * BigInt(2) > BigInt(1000000) ? baseFee * BigInt(2) : BigInt(1000000);

  const result: any = {
    sender, nonce: toHex(nonce), initCode, callData,
    accountGasLimits: packGasLimits(BigInt(gasEstimate.verificationGasLimit), BigInt(gasEstimate.callGasLimit)),
    preVerificationGas: gasEstimate.preVerificationGas,
    gasFees: packGasFees(BigInt(0), maxFeePerGas),
    paymasterAndData: "0x" as Hex,
    signature: "0x" as Hex,
  };

  // Try paymaster
  const pmUrl = opts.paymasterUrl || PAYMASTER_URLS[network];
  if (pmUrl) {
    try {
      const pmRes = await fetch(pmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userOp: result }),
      });
      const pmData = await pmRes.json();
      if (pmData.paymasterAndData) result.paymasterAndData = pmData.paymasterAndData;
    } catch {}
  }

  return result;
}

// ─── Signing ────────────────────────────────────────────────────────

export async function signUserOpWithPasskey(
  userOp: any,
  credentialId: string,
  network: string = "testnet"
): Promise<Hex> {
  const userOpHash = computeUserOpHash(userOp, ENTRYPOINT_V07, getChainId(network));

  // Inline WebAuthn assertion + signature encoding (from @flowindex/evm-wallet/signer)
  const challengeBytes = new Uint8Array(
    (userOpHash.slice(2).match(/.{2}/g) ?? []).map((b: string) => parseInt(b, 16))
  );
  const base64urlToBytes = (b64url: string) => {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  };

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: challengeBytes,
      allowCredentials: [{ id: base64urlToBytes(credentialId), type: "public-key" as const }],
      userVerification: "preferred",
    },
  })) as any;

  const response = assertion.response;
  const authenticatorData = new Uint8Array(response.authenticatorData);
  const clientDataJSON = new TextDecoder().decode(response.clientDataJSON);
  const signature = new Uint8Array(response.signature);
  const { r, s } = derToRS(signature);

  return encodeWebAuthnSignature({
    ownerIndex: BigInt(0),
    authenticatorData,
    clientDataJSON,
    r, s,
  });
}

function derToRS(der: Uint8Array): { r: bigint; s: bigint } {
  let offset = 2;
  if (der[offset] !== 0x02) throw new Error("Expected 0x02 tag for r");
  offset++;
  const rLen = der[offset]; offset++;
  const rBytes = der.slice(offset, offset + rLen); offset += rLen;
  if (der[offset] !== 0x02) throw new Error("Expected 0x02 tag for s");
  offset++;
  const sLen = der[offset]; offset++;
  const sBytes = der.slice(offset, offset + sLen);
  const toHexStr = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return { r: BigInt("0x" + toHexStr(rBytes)), s: BigInt("0x" + toHexStr(sBytes)) };
}

function encodeWebAuthnSignature(params: {
  ownerIndex: bigint; authenticatorData: Uint8Array; clientDataJSON: string; r: bigint; s: bigint;
}): Hex {
  const { ownerIndex, authenticatorData, clientDataJSON, r, s } = params;
  const challengeIdx = BigInt(clientDataJSON.indexOf('"challenge":"') + '"challenge":"'.length);
  const typeIdx = BigInt(clientDataJSON.indexOf('"type":"') + '"type":"'.length);
  const sigData = encodeAbiParameters(
    [{ type: "bytes" }, { type: "string" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
    [toHex(authenticatorData), clientDataJSON, challengeIdx, typeIdx, r, s]
  );
  return encodeAbiParameters([{ type: "uint256" }, { type: "bytes" }], [ownerIndex, sigData]) as Hex;
}

export async function signUserOpWithECDSA(
  userOp: any,
  privateKey: string,
  network: string = "testnet"
): Promise<Hex> {
  const { privateKeyToAccount } = await import("viem/accounts");
  const userOpHash = computeUserOpHash(userOp, ENTRYPOINT_V07, getChainId(network));
  const pk = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex;
  const account = privateKeyToAccount(pk);
  const signature = await account.signMessage({ message: { raw: userOpHash } });
  return encodeAbiParameters([{ type: "uint256" }, { type: "bytes" }], [BigInt(0), signature]) as Hex;
}

// ─── Submit ─────────────────────────────────────────────────────────

export async function submitUserOp(userOp: any, network: string = "testnet"): Promise<Hex> {
  const bundlerUrl = BUNDLER_URLS[network] || BUNDLER_URLS.testnet;
  return createBundlerClient(bundlerUrl).sendUserOperation(userOp, ENTRYPOINT_V07);
}

export async function waitForUserOpReceipt(
  userOpHash: Hex,
  network: string = "testnet",
  timeoutMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<any> {
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
    throw new Error("Must provide credentialId or privateKey for signing");
  }

  return submitUserOp(userOp, network);
}
