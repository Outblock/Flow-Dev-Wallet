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

interface EvmKeyInfo {
  pk?: string;
  mnemonic?: string;
  [key: string]: unknown;
}

/**
 * @param method - RPC method
 * @param params - RPC params
 * @param keyInfo - Key info with pk, mnemonic, type, etc.
 * @param network - Network name
 */
export async function handleEvmRpc(method: string, params: unknown[], keyInfo: EvmKeyInfo, network: string): Promise<unknown> {
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
