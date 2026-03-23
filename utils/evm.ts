export interface EvmChain {
  chainId: number;
  rpcUrl: string;
  name: string;
}

type Network = "mainnet" | "testnet" | "emulator";

export const EVM_CHAINS: Record<Network, EvmChain> = {
  mainnet: { chainId: 747, rpcUrl: 'https://mainnet.evm.nodes.onflow.org', name: 'Flow EVM Mainnet' },
  testnet: { chainId: 545, rpcUrl: 'https://testnet.evm.nodes.onflow.org', name: 'Flow EVM Testnet' },
  emulator: { chainId: 646, rpcUrl: 'http://localhost:8545', name: 'Flow EVM Emulator' },
}

export function getEvmChain(network: string): EvmChain {
  return EVM_CHAINS[network as Network] || EVM_CHAINS.testnet
}

export async function deriveEvmAddress(privateKey: string): Promise<string> {
  const { privateKeyToAccount } = await import('viem/accounts')
  const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  const account = privateKeyToAccount(pk as `0x${string}`)
  return account.address
}

export async function deriveEvmAddressFromMnemonic(mnemonic: string, index: number = 0): Promise<string> {
  const { mnemonicToAccount } = await import('viem/accounts')
  const account = mnemonicToAccount(mnemonic, { addressIndex: index })
  return account.address
}
