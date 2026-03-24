import { getEvmChain } from "./evm";
import type { PrivateKeyAccount, HDAccount } from "viem/accounts";

export async function createEvmAccount(pk: string): Promise<PrivateKeyAccount> {
  const { privateKeyToAccount } = await import("viem/accounts");
  return privateKeyToAccount(pk.startsWith("0x") ? pk as `0x${string}` : `0x${pk}` as `0x${string}`);
}

export async function createEvmAccountFromMnemonic(mnemonic: string, index: number = 0): Promise<HDAccount> {
  const { mnemonicToAccount } = await import("viem/accounts");
  return mnemonicToAccount(mnemonic, { addressIndex: index });
}

export interface EvmKeyInfo {
  pk?: string;
  mnemonic?: string;
  type?: string;
  credentialId?: string;
  publicKeySec1Hex?: string;
  smartWalletAddress?: string;
  [key: string]: unknown;
}

/**
 * @param method - RPC method
 * @param params - RPC params
 * @param keyInfo - Key info with pk, mnemonic, type, etc.
 * @param network - Network name
 */
export async function handleEvmRpc(method: string, params: unknown[], keyInfo: EvmKeyInfo, network: string): Promise<unknown> {
  const isSmartWallet = !!keyInfo.smartWalletAddress;

  // Route signing methods through smart wallet (4337) when applicable
  if (isSmartWallet) {
    switch (method) {
      case "eth_sendTransaction":
        return handleSmartWalletSendTx(params, keyInfo, network);

      case "personal_sign": {
        const { signMessageWithPasskey, isSmartWalletDeployed } = await import("./smartWallet");
        const sender = keyInfo.smartWalletAddress as `0x${string}`;

        // Auto-deploy smart wallet if not yet deployed (ERC-1271 needs on-chain contract)
        const deployed = await isSmartWalletDeployed(sender, network);
        if (!deployed) {
          console.log("[evm-signer] Smart wallet not deployed, deploying...");
          const { deploySmartWallet } = await import("./smartWallet");
          await deploySmartWallet(keyInfo, network);
          console.log("[evm-signer] Smart wallet deployed successfully");
        }

        const msgHex = typeof params[0] === "string" && (params[0] as string).startsWith("0x")
          ? params[0] as `0x${string}`
          : ("0x" + Buffer.from(params[0] as string, "utf8").toString("hex")) as `0x${string}`;
        if (keyInfo.credentialId) {
          return signMessageWithPasskey(
            msgHex,
            keyInfo.credentialId,
            sender,
            network
          );
        } else if (keyInfo.pk) {
          return handleSmartWalletPersonalSignECDSA(msgHex, keyInfo, network);
        }
        throw new Error("Smart wallet requires credentialId or privateKey for personal_sign");
      }

      case "eth_signTypedData_v4": {
        const { signTypedDataWithPasskey, isSmartWalletDeployed: isDeployed } = await import("./smartWallet");
        const senderAddr = keyInfo.smartWalletAddress as `0x${string}`;

        // Auto-deploy smart wallet if not yet deployed
        if (!(await isDeployed(senderAddr, network))) {
          console.log("[evm-signer] Smart wallet not deployed, deploying...");
          const { deploySmartWallet } = await import("./smartWallet");
          await deploySmartWallet(keyInfo, network);
          console.log("[evm-signer] Smart wallet deployed successfully");
        }

        const typedData = typeof params[1] === "string" ? JSON.parse(params[1] as string) : params[1];
        if (keyInfo.credentialId) {
          return signTypedDataWithPasskey(
            typedData,
            keyInfo.credentialId,
            keyInfo.smartWalletAddress as `0x${string}`,
            network
          );
        } else if (keyInfo.pk) {
          // ECDSA fallback for smart wallets with private key
          const account = await createEvmAccount(keyInfo.pk);
          return await account.signTypedData(typedData);
        }
        throw new Error("Smart wallet requires credentialId or privateKey for eth_signTypedData_v4");
      }
    }
  }

  const { createWalletClient, createPublicClient, http } = await import("viem");
  const chain = getEvmChain(network);

  const viemChain = {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: { name: "FLOW", symbol: "FLOW", decimals: 18 },
    rpcUrls: { default: { http: [chain.rpcUrl] } },
  };

  // Non-smart-wallet path: needs pk or mnemonic
  const account = keyInfo.mnemonic
    ? await createEvmAccountFromMnemonic(keyInfo.mnemonic)
    : await createEvmAccount(keyInfo.pk!);

  switch (method) {
    case "eth_sendTransaction": {
      const client = createWalletClient({
        account,
        chain: viemChain,
        transport: http(chain.rpcUrl),
      });
      const tx: Record<string, unknown> = { ...(params[0] as Record<string, unknown>) };
      if (tx.gas) tx.gas = BigInt(tx.gas as string | number);
      if (tx.value) tx.value = BigInt(tx.value as string | number);
      if (tx.gasPrice) tx.gasPrice = BigInt(tx.gasPrice as string | number);
      if (tx.maxFeePerGas) tx.maxFeePerGas = BigInt(tx.maxFeePerGas as string | number);
      if (tx.maxPriorityFeePerGas)
        tx.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas as string | number);
      return await client.sendTransaction(tx as any);
    }

    case "personal_sign": {
      const message =
        typeof params[0] === "string" && (params[0] as string).startsWith("0x")
          ? { raw: params[0] as `0x${string}` }
          : params[0];
      return await account.signMessage({ message: message as any });
    }

    case "eth_signTypedData_v4": {
      const typedData =
        typeof params[1] === "string" ? JSON.parse(params[1]) : params[1];
      return await account.signTypedData(typedData);
    }

    default: {
      const publicClient = createPublicClient({
        chain: viemChain,
        transport: http(chain.rpcUrl),
      });
      return await publicClient.request({ method: method as any, params: params as any });
    }
  }
}

/**
 * ECDSA personal_sign for smart wallets with a private key.
 * Signs the CoinbaseSmartWallet replaySafeHash.
 */
async function handleSmartWalletPersonalSignECDSA(
  messageHex: `0x${string}`,
  keyInfo: EvmKeyInfo,
  network: string
): Promise<string> {
  const { hashMessage, keccak256, encodeAbiParameters, concat, toHex } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { getEvmChain } = await import("./evm");

  const chain = getEvmChain(network);
  const messageHash = hashMessage({ raw: messageHex });

  // Compute CoinbaseSmartWallet replaySafeHash
  const domainSeparator = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }, { type: "address" }],
      [
        keccak256(toHex("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")),
        keccak256(toHex("Coinbase Smart Wallet")),
        keccak256(toHex("1")),
        BigInt(chain.chainId),
        keyInfo.smartWalletAddress as `0x${string}`,
      ]
    )
  );
  const CBS_MESSAGE_TYPEHASH = keccak256(toHex("CoinbaseSmartWalletMessage(bytes32 hash)"));
  const hashStruct = keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [CBS_MESSAGE_TYPEHASH, messageHash])
  );
  const replaySafeHash = keccak256(concat(["0x1901" as `0x${string}`, domainSeparator, hashStruct]));

  const pk = (keyInfo.pk!.startsWith("0x") ? keyInfo.pk! : `0x${keyInfo.pk!}`) as `0x${string}`;
  const account = privateKeyToAccount(pk);
  const sig = await account.signMessage({ message: { raw: replaySafeHash } });

  // Wrap in CoinbaseSmartWallet format: ownerIndex + signature
  return encodeAbiParameters([{ type: "uint256" }, { type: "bytes" }], [BigInt(0), sig as `0x${string}`]);
}

/**
 * Handle eth_sendTransaction via ERC-4337 UserOperation.
 * Builds, signs, and submits a UserOp through the bundler.
 */
async function handleSmartWalletSendTx(
  params: unknown[],
  keyInfo: EvmKeyInfo,
  network: string
): Promise<string> {
  const { sendSmartWalletTransaction, isSmartWalletDeployed, waitForUserOpReceipt } =
    await import("./smartWallet");
  const type = await import("viem");

  const txParams = params[0] as Record<string, string>;
  const sender = keyInfo.smartWalletAddress as `0x${string}`;

  // Check if wallet is already deployed
  const deployed = await isSmartWalletDeployed(sender, network);

  // Build and submit the UserOp
  const userOpHash = await sendSmartWalletTransaction(
    {
      to: txParams.to as `0x${string}`,
      value: txParams.value ? BigInt(txParams.value) : BigInt(0),
      data: (txParams.data || "0x") as `0x${string}`,
    },
    {
      sender,
      publicKeySec1Hex: keyInfo.publicKeySec1Hex!,
      isDeployed: deployed,
      network,
      credentialId: keyInfo.credentialId,
      privateKey: keyInfo.pk,
    }
  );

  // Wait for the UserOp to be mined and return the tx hash
  try {
    const receipt = await waitForUserOpReceipt(userOpHash, network, 30000);
    return receipt.receipt.transactionHash;
  } catch {
    // If polling times out, return the userOpHash as fallback
    return userOpHash;
  }
}
