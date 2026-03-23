import { getEvmChain } from "./evm";

export async function createEvmAccount(pk) {
  const { privateKeyToAccount } = await import("viem/accounts");
  return privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
}

export async function handleEvmRpc(method, params, pk, network) {
  const { createWalletClient, createPublicClient, http } = await import("viem");
  const chain = getEvmChain(network);

  const viemChain = {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: { name: "FLOW", symbol: "FLOW", decimals: 18 },
    rpcUrls: { default: { http: [chain.rpcUrl] } },
  };

  const account = await createEvmAccount(pk);

  switch (method) {
    case "eth_sendTransaction": {
      const client = createWalletClient({
        account,
        chain: viemChain,
        transport: http(chain.rpcUrl),
      });
      const tx = { ...params[0] };
      if (tx.gas) tx.gas = BigInt(tx.gas);
      if (tx.value) tx.value = BigInt(tx.value);
      if (tx.gasPrice) tx.gasPrice = BigInt(tx.gasPrice);
      if (tx.maxFeePerGas) tx.maxFeePerGas = BigInt(tx.maxFeePerGas);
      if (tx.maxPriorityFeePerGas)
        tx.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas);
      return await client.sendTransaction(tx);
    }

    case "personal_sign": {
      const message =
        typeof params[0] === "string" && params[0].startsWith("0x")
          ? { raw: params[0] }
          : params[0];
      return await account.signMessage({ message });
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
      return await publicClient.request({ method, params });
    }
  }
}
