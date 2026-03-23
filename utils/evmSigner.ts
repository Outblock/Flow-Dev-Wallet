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
  // Route through smart wallet (4337) if the wallet has a smart wallet address
  if (keyInfo.smartWalletAddress && method === "eth_sendTransaction") {
    return handleSmartWalletSendTx(params, keyInfo, network);
  }

  const { createWalletClient, createPublicClient, http } = await import("viem");
  const chain = getEvmChain(network);

  const viemChain = {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: { name: "FLOW", symbol: "FLOW", decimals: 18 },
    rpcUrls: { default: { http: [chain.rpcUrl] } },
  };

  // Seed phrase: derive EVM account from mnemonic (Ethereum BIP-44 path)
  // Private key: use the key directly (same key for Flow and EVM)
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
