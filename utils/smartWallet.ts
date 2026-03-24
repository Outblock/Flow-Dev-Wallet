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
export const FACTORY_ADDRESS: Address = "0x8E4333c6878A32F49611670EAD1793597392C48f";
export const PAYMASTER_ADDRESS: Address = "0x6160d63ca23b9364e44daf9ca2acd72e374eaef5";

export const BUNDLER_URLS: Record<string, string> = {
  testnet: "https://bundler.flowindex.io/545/rpc",
  mainnet: "https://bundler.flowindex.io/747/rpc",
};

export const PAYMASTER_URLS: Record<string, string> = {
  testnet: "https://bundler.flowindex.io/545/paymaster",
  mainnet: "https://bundler.flowindex.io/747/paymaster",
};

// Viem's official WebAuthn stub signature for CoinbaseSmartWallet gas estimation.
// This is a properly ABI-encoded (uint256 ownerIndex, bytes WebAuthnAuth) that
// the contract can decode without reverting. Signature validation returns
// SIG_VALIDATION_FAILED (1) instead of reverting, allowing gas estimation to work.
// Source: viem toCoinbaseSmartAccount getStubSignature()
const WEBAUTHN_STUB_SIGNATURE: Hex = "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001949fc7c88032b9fcb5f6efc7a7b8c63668eae9871b765e23123bb473ff57aa831a7c0d9276168ebcc29f2875a0239cffdf2a9cd1c2007c5c77c071db9264df1d000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2273496a396e6164474850596755334b7556384f7a4a666c726275504b474f716d59576f4d57516869467773222c226f726967696e223a2268747470733a2f2f7369676e2e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d00000000000000000000000000000000000000000000" as Hex;

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

function unpackGasLimits(accountGasLimits: Hex): { verificationGasLimit: Hex; callGasLimit: Hex } {
  const clean = accountGasLimits.startsWith("0x") ? accountGasLimits.slice(2) : accountGasLimits;
  const padded = clean.padStart(64, "0");
  return {
    verificationGasLimit: `0x${padded.slice(0, 32)}` as Hex,
    callGasLimit: `0x${padded.slice(32, 64)}` as Hex,
  };
}

function unpackGasFees(gasFees: Hex): { maxPriorityFeePerGas: Hex; maxFeePerGas: Hex } {
  const clean = gasFees.startsWith("0x") ? gasFees.slice(2) : gasFees;
  const padded = clean.padStart(64, "0");
  return {
    maxPriorityFeePerGas: `0x${padded.slice(0, 32)}` as Hex,
    maxFeePerGas: `0x${padded.slice(32, 64)}` as Hex,
  };
}

function splitInitCode(initCode?: Hex): { factory?: Address; factoryData?: Hex } {
  if (!initCode || initCode === "0x") return {};
  const clean = initCode.startsWith("0x") ? initCode.slice(2) : initCode;
  if (clean.length < 40) {
    throw new Error("Invalid initCode: missing factory address");
  }
  return {
    factory: `0x${clean.slice(0, 40)}` as Address,
    factoryData: (`0x${clean.slice(40)}` || "0x") as Hex,
  };
}

function splitPaymasterAndData(paymasterAndData?: Hex): {
  paymaster?: Address;
  paymasterVerificationGasLimit?: Hex;
  paymasterPostOpGasLimit?: Hex;
  paymasterData?: Hex;
} {
  if (!paymasterAndData || paymasterAndData === "0x") return {};
  const clean = paymasterAndData.startsWith("0x") ? paymasterAndData.slice(2) : paymasterAndData;
  if (clean.length < 104) {
    throw new Error("Invalid paymasterAndData: missing gas limits");
  }
  return {
    paymaster: `0x${clean.slice(0, 40)}` as Address,
    paymasterVerificationGasLimit: `0x${clean.slice(40, 72)}` as Hex,
    paymasterPostOpGasLimit: `0x${clean.slice(72, 104)}` as Hex,
    paymasterData: (`0x${clean.slice(104)}` || "0x") as Hex,
  };
}

function toBundlerRpcUserOp(userOp: any): any {
  const rpcUserOp: any = {
    sender: userOp.sender,
    nonce: userOp.nonce,
    callData: userOp.callData,
    preVerificationGas: userOp.preVerificationGas,
    signature: userOp.signature ?? "0x",
  };

  if (userOp.callGasLimit !== undefined && userOp.verificationGasLimit !== undefined) {
    rpcUserOp.callGasLimit = userOp.callGasLimit;
    rpcUserOp.verificationGasLimit = userOp.verificationGasLimit;
  } else if (userOp.accountGasLimits) {
    Object.assign(rpcUserOp, unpackGasLimits(userOp.accountGasLimits));
  }

  if (userOp.maxFeePerGas !== undefined && userOp.maxPriorityFeePerGas !== undefined) {
    rpcUserOp.maxFeePerGas = userOp.maxFeePerGas;
    rpcUserOp.maxPriorityFeePerGas = userOp.maxPriorityFeePerGas;
  } else if (userOp.gasFees) {
    Object.assign(rpcUserOp, unpackGasFees(userOp.gasFees));
  }

  if (userOp.factory || userOp.factoryData) {
    rpcUserOp.factory = userOp.factory;
    rpcUserOp.factoryData = userOp.factoryData;
  } else {
    Object.assign(rpcUserOp, splitInitCode(userOp.initCode));
  }

  if (
    userOp.paymaster ||
    userOp.paymasterVerificationGasLimit ||
    userOp.paymasterPostOpGasLimit ||
    userOp.paymasterData
  ) {
    rpcUserOp.paymaster = userOp.paymaster;
    rpcUserOp.paymasterVerificationGasLimit = userOp.paymasterVerificationGasLimit;
    rpcUserOp.paymasterPostOpGasLimit = userOp.paymasterPostOpGasLimit;
    rpcUserOp.paymasterData = userOp.paymasterData;
  } else {
    Object.assign(rpcUserOp, splitPaymasterAndData(userOp.paymasterAndData));
  }

  return rpcUserOp;
}

export function computeUserOpHash(
  userOp: any,
  entryPoint: Address,
  chainId: number
): Hex {
  // Support both packed (v0.7 on-chain) and unpacked (bundler) formats
  const accountGasLimits: Hex = userOp.accountGasLimits
    ?? packGasLimits(BigInt(userOp.verificationGasLimit), BigInt(userOp.callGasLimit));
  const gasFees: Hex = userOp.gasFees
    ?? packGasFees(BigInt(userOp.maxPriorityFeePerGas), BigInt(userOp.maxFeePerGas));

  const packed = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes32" }],
    [userOp.sender, BigInt(userOp.nonce), keccak256(userOp.initCode), keccak256(userOp.callData), accountGasLimits, BigInt(userOp.preVerificationGas), gasFees, keccak256(userOp.paymasterAndData)]
  );
  const innerHash = keccak256(packed);
  return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }, { type: "uint256" }], [innerHash, entryPoint, BigInt(chainId)]));
}

// ─── Bundler Client ─────────────────────────────────────────────────

function createBundlerClient(bundlerUrl: string) {
  async function rpc(method: string, params: any[]): Promise<any> {
    // In browser, proxy through /api/bundler to avoid CORS
    const fetchUrl = typeof window !== "undefined"
      ? `/api/bundler?url=${encodeURIComponent(bundlerUrl)}`
      : bundlerUrl;
    const res = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.result;
  }
  return {
    sendUserOperation: (userOp: any, entryPoint: Address) =>
      rpc("eth_sendUserOperation", [toBundlerRpcUserOp(userOp), entryPoint]) as Promise<Hex>,
    estimateUserOperationGas: (userOp: any, entryPoint: Address) =>
      rpc("eth_estimateUserOperationGas", [toBundlerRpcUserOp(userOp), entryPoint]),
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
    authorizationList: undefined,
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
    authorizationList: undefined,
    abi: ENTRYPOINT_ABI,
    functionName: "getNonce",
    args: [sender, BigInt(0)],
  });

  const initCode: Hex = opts.isDeployed ? "0x" : buildInitCode(opts.publicKeySec1Hex);
  const callData: Hex = callParams.length === 1
    ? encodeFunctionData({ abi: SMART_WALLET_ABI, functionName: "execute", args: [callParams[0].target, callParams[0].value, callParams[0].data] })
    : encodeFunctionData({ abi: SMART_WALLET_ABI, functionName: "executeBatch", args: [callParams] });

  const dummySig = WEBAUTHN_STUB_SIGNATURE;

  const block = await client.getBlock();
  const baseFee = block.baseFeePerGas ?? BigInt(1);
  const maxFeePerGas = baseFee * BigInt(2) > BigInt(1000000) ? baseFee * BigInt(2) : BigInt(1000000);

  // Step 1: Get paymasterAndData FIRST (paymaster expects packed v0.7 format)
  let paymasterAndData: Hex = "0x";
  const pmUrl = opts.paymasterUrl || PAYMASTER_URLS[network];
  if (pmUrl) {
    try {
      const pmFetchUrl = typeof window !== "undefined"
        ? `/api/bundler?url=${encodeURIComponent(pmUrl)}`
        : pmUrl;
      const pmUserOp = {
        sender, nonce: toHex(nonce), initCode, callData,
        accountGasLimits: packGasLimits(BigInt(500000), BigInt(500000)),
        preVerificationGas: toHex(BigInt(100000)),
        gasFees: packGasFees(BigInt(0), maxFeePerGas),
        paymasterAndData: "0x",
        signature: dummySig,
      };
      const pmRes = await fetch(pmFetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userOp: pmUserOp }),
      });
      const pmData = await pmRes.json();
      if (pmData.paymasterAndData) paymasterAndData = pmData.paymasterAndData;
    } catch (e) {
      console.warn("[smartWallet] paymaster error:", e);
    }
  }

  // Step 2: Estimate gas WITH paymasterAndData (bundler expects unpacked fields)
  const gasEstimate = await bundlerClient.estimateUserOperationGas({
    sender, nonce: toHex(nonce), initCode, callData, signature: dummySig,
    paymasterAndData,
    callGasLimit: toHex(BigInt(500000)),
    verificationGasLimit: toHex(BigInt(500000)),
    preVerificationGas: toHex(BigInt(100000)),
    maxFeePerGas: toHex(maxFeePerGas),
    maxPriorityFeePerGas: toHex(BigInt(0)),
  }, ENTRYPOINT_V07);

  // Step 3: Build final UserOp with estimated gas
  const result: any = {
    sender, nonce: toHex(nonce), initCode, callData,
    callGasLimit: toHex(BigInt(gasEstimate.callGasLimit)),
    verificationGasLimit: toHex(BigInt(gasEstimate.verificationGasLimit)),
    preVerificationGas: gasEstimate.preVerificationGas,
    maxFeePerGas: toHex(maxFeePerGas),
    maxPriorityFeePerGas: toHex(BigInt(0)),
    paymasterAndData,
    signature: "0x" as Hex,
  };

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

function findChallengeIndex(clientDataJSON: string): number {
  const idx = clientDataJSON.indexOf('"challenge"');
  if (idx === -1) throw new Error("challenge not found in clientDataJSON");
  return idx;
}

function findTypeIndex(clientDataJSON: string): number {
  const idx = clientDataJSON.indexOf('"type"');
  if (idx === -1) throw new Error("type not found in clientDataJSON");
  return idx;
}

function encodeSignatureWrapper(ownerIndex: bigint, signatureData: Hex): Hex {
  return encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "ownerIndex", type: "uint256" },
          { name: "signatureData", type: "bytes" },
        ],
      },
    ],
    [{ ownerIndex, signatureData }],
  ) as Hex;
}

function encodeWebAuthnSignature(params: {
  ownerIndex: bigint; authenticatorData: Uint8Array; clientDataJSON: string; r: bigint; s: bigint;
}): Hex {
  const { ownerIndex, authenticatorData, clientDataJSON, r, s } = params;
  const challengeIdx = BigInt(findChallengeIndex(clientDataJSON));
  const typeIdx = BigInt(findTypeIndex(clientDataJSON));
  const sigData = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "authenticatorData", type: "bytes" },
          { name: "clientDataJSON", type: "string" },
          { name: "challengeIndex", type: "uint256" },
          { name: "typeIndex", type: "uint256" },
          { name: "r", type: "uint256" },
          { name: "s", type: "uint256" },
        ],
      },
    ],
    [{
      authenticatorData: toHex(authenticatorData),
      clientDataJSON,
      challengeIndex: challengeIdx,
      typeIndex: typeIdx,
      r,
      s,
    }]
  ) as Hex;
  return encodeSignatureWrapper(ownerIndex, sigData);
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
  return encodeSignatureWrapper(BigInt(0), signature as Hex);
}

// ─── ERC-1271 Personal Sign (CoinbaseSmartWallet) ───────────────────

/**
 * Sign a personal_sign message with passkey for CoinbaseSmartWallet.
 * Computes the EIP-712 replaySafeHash off-chain, then signs with WebAuthn.
 * The returned signature is ERC-1271 compatible.
 */
export async function signMessageWithPasskey(
  messageHex: Hex,
  credentialId: string,
  smartWalletAddress: Address,
  network: string = "testnet"
): Promise<Hex> {
  const { hashMessage } = await import("viem");

  // 1. Compute the EIP-191 personal message hash (what dApp passes to isValidSignature)
  const messageHash = hashMessage({ raw: messageHex });

  // 2. Compute CoinbaseSmartWallet replaySafeHash (EIP-712)
  const chainId = getChainId(network);
  const replaySafeHash = computeReplaySafeHash(messageHash, smartWalletAddress, chainId);

  // 3. Sign with passkey
  return signHashWithPasskey(replaySafeHash, credentialId);
}

/**
 * Sign typed data (EIP-712) with passkey for CoinbaseSmartWallet.
 */
export async function signTypedDataWithPasskey(
  typedData: any,
  credentialId: string,
  smartWalletAddress: Address,
  network: string = "testnet"
): Promise<Hex> {
  const { hashTypedData } = await import("viem");

  // 1. Compute the EIP-712 hash of the typed data
  const typedDataHash = hashTypedData(typedData);

  // 2. Wrap with CoinbaseSmartWallet replaySafeHash
  const chainId = getChainId(network);
  const replaySafeHash = computeReplaySafeHash(typedDataHash, smartWalletAddress, chainId);

  // 3. Sign with passkey
  return signHashWithPasskey(replaySafeHash, credentialId);
}

/**
 * Compute the CoinbaseSmartWallet EIP-712 replaySafeHash.
 * This is what the contract's isValidSignature verifies against.
 */
function computeReplaySafeHash(hash: Hex, account: Address, chainId: number): Hex {
  // EIP-712 domain separator for CoinbaseSmartWallet
  const domainSeparator = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }, { type: "address" }],
      [
        keccak256(toHex("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")),
        keccak256(toHex("Coinbase Smart Wallet")),
        keccak256(toHex("1")),
        BigInt(chainId),
        account,
      ]
    )
  );

  // CoinbaseSmartWalletMessage hash struct
  const CBS_MESSAGE_TYPEHASH = keccak256(
    toHex("CoinbaseSmartWalletMessage(bytes32 hash)")
  );
  const hashStruct = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }],
      [CBS_MESSAGE_TYPEHASH, hash]
    )
  );

  // EIP-712: \x19\x01 ++ domainSeparator ++ hashStruct
  return keccak256(concat(["0x1901" as Hex, domainSeparator, hashStruct]));
}

/**
 * Sign a raw 32-byte hash with passkey via WebAuthn.
 */
async function signHashWithPasskey(hash: Hex, credentialId: string): Promise<Hex> {
  const challengeBytes = new Uint8Array(
    (hash.slice(2).match(/.{2}/g) ?? []).map((b: string) => parseInt(b, 16))
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

// ─── Deploy ─────────────────────────────────────────────────────────

/**
 * Deploy the smart wallet by submitting a UserOp with initCode and empty executeBatch.
 * This is a no-op transaction that only triggers wallet creation.
 */
export async function deploySmartWallet(
  keyInfo: { smartWalletAddress?: string; publicKeySec1Hex?: string; credentialId?: string; pk?: string },
  network: string = "testnet"
): Promise<string> {
  const sender = keyInfo.smartWalletAddress as Address;
  const publicKeySec1Hex = keyInfo.publicKeySec1Hex!;
  const rpcUrl = getRpcUrl(network);
  const bundlerUrl = BUNDLER_URLS[network] || BUNDLER_URLS.testnet;
  const bundlerClient = createBundlerClient(bundlerUrl);
  const client = createPublicClient({ transport: http(rpcUrl) });

  const nonce = await client.readContract({
    address: ENTRYPOINT_V07,
    authorizationList: undefined,
    abi: ENTRYPOINT_ABI,
    functionName: "getNonce",
    args: [sender, BigInt(0)],
  });

  const initCode = buildInitCode(publicKeySec1Hex);
  // executeBatch with empty array = no-op, just deploys the wallet
  const callData = encodeFunctionData({
    abi: SMART_WALLET_ABI,
    functionName: "executeBatch",
    args: [[]],
  });

  const dummySig = WEBAUTHN_STUB_SIGNATURE;

  const block = await client.getBlock();
  const baseFee = block.baseFeePerGas ?? BigInt(1);
  const maxFeePerGas = baseFee * BigInt(2) > BigInt(1000000) ? baseFee * BigInt(2) : BigInt(1000000);

  // Step 1: Get paymasterAndData FIRST (paymaster expects packed v0.7 format)
  let paymasterAndData: Hex = "0x";
  const pmUrl = PAYMASTER_URLS[network];
  if (pmUrl) {
    try {
      const pmFetchUrl = typeof window !== "undefined"
        ? `/api/bundler?url=${encodeURIComponent(pmUrl)}`
        : pmUrl;
      const pmUserOp = {
        sender, nonce: toHex(nonce as bigint), initCode, callData,
        accountGasLimits: packGasLimits(BigInt(500000), BigInt(500000)),
        preVerificationGas: toHex(BigInt(100000)),
        gasFees: packGasFees(BigInt(0), maxFeePerGas),
        paymasterAndData: "0x",
        signature: dummySig,
      };
      const pmRes = await fetch(pmFetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userOp: pmUserOp }),
      });
      const pmData = await pmRes.json();
      if (pmData.paymasterAndData) paymasterAndData = pmData.paymasterAndData;
    } catch (e) {
      console.warn("[smartWallet] paymaster error:", e);
    }
  }

  // Step 2: Estimate gas WITH paymasterAndData
  const gasEstimate = await bundlerClient.estimateUserOperationGas({
    sender, nonce: toHex(nonce as bigint), initCode, callData, signature: dummySig,
    paymasterAndData,
    callGasLimit: toHex(BigInt(500000)),
    verificationGasLimit: toHex(BigInt(500000)),
    preVerificationGas: toHex(BigInt(100000)),
    maxFeePerGas: toHex(maxFeePerGas),
    maxPriorityFeePerGas: toHex(BigInt(0)),
  }, ENTRYPOINT_V07);

  // Step 3: Build final UserOp
  const userOp: any = {
    sender, nonce: toHex(nonce as bigint), initCode, callData,
    callGasLimit: toHex(BigInt(gasEstimate.callGasLimit)),
    verificationGasLimit: toHex(BigInt(gasEstimate.verificationGasLimit)),
    preVerificationGas: gasEstimate.preVerificationGas,
    maxFeePerGas: toHex(maxFeePerGas),
    maxPriorityFeePerGas: toHex(BigInt(0)),
    paymasterAndData,
    signature: "0x" as Hex,
  };

  // Sign
  if (keyInfo.credentialId) {
    userOp.signature = await signUserOpWithPasskey(userOp, keyInfo.credentialId, network);
  } else if (keyInfo.pk) {
    userOp.signature = await signUserOpWithECDSA(userOp, keyInfo.pk, network);
  } else {
    throw new Error("Must provide credentialId or privateKey for deploy");
  }

  const userOpHash = await submitUserOp(userOp, network);
  const receipt = await waitForUserOpReceipt(userOpHash, network, 30000);
  return receipt.receipt.transactionHash;
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
