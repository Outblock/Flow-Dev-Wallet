export const EVM_CHAINS = {
  mainnet: { chainId: 747, rpcUrl: 'https://mainnet.evm.nodes.onflow.org', name: 'Flow EVM Mainnet' },
  testnet: { chainId: 545, rpcUrl: 'https://testnet.evm.nodes.onflow.org', name: 'Flow EVM Testnet' },
  emulator: { chainId: 646, rpcUrl: 'http://localhost:8545', name: 'Flow EVM Emulator' },
}

export function getEvmChain(network) {
  return EVM_CHAINS[network] || EVM_CHAINS.testnet
}

export async function deriveEvmAddress(privateKey) {
  const { privateKeyToAccount } = await import('viem/accounts')
  const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  const account = privateKeyToAccount(pk)
  return account.address
}

export async function deriveEvmAddressFromMnemonic(mnemonic, index = 0) {
  const { mnemonicToAccount } = await import('viem/accounts')
  const account = mnemonicToAccount(mnemonic, { addressIndex: index })
  return account.address
}
