function getBaseUrl(network) {
  const net = network || (typeof window !== 'undefined' ? localStorage.getItem('settings_config') && JSON.parse(localStorage.getItem('settings_config')).network : null) || process.env.network || 'testnet';
  if (net === 'testnet') return 'https://testnet.flowindex.io/api';
  if (net === 'emulator') return process.env.flowindexUrl || 'http://localhost:8080/api';
  return 'https://flowindex.io/api'; // mainnet
}

export async function getFlowAccount(address, network) {
  const res = await fetch(`${getBaseUrl(network)}/flow/account/${address}`);
  return res.json();
}

export async function getFlowTokens(address, network) {
  const res = await fetch(`${getBaseUrl(network)}/flow/account/${address}/ft`);
  return res.json();
}

export async function getFlowNFTs(address, network) {
  const res = await fetch(`${getBaseUrl(network)}/flow/account/${address}/nft`);
  return res.json();
}

export async function getEvmTokens(evmAddress, network) {
  const res = await fetch(`${getBaseUrl(network)}/flow/evm/address/${evmAddress}/token`);
  return res.json();
}

export async function getEvmNFTs(evmAddress, network) {
  const res = await fetch(`${getBaseUrl(network)}/flow/evm/address/${evmAddress}/nft`);
  return res.json();
}

export async function getEvmBalance(evmAddress, network) {
  const res = await fetch(`${getBaseUrl(network)}/flow/evm/address/${evmAddress}`);
  return res.json();
}

export async function getFlowTransactions(address, network, limit = 20) {
  const res = await fetch(`${getBaseUrl(network)}/flow/account/${address}/transactions?limit=${limit}`);
  return res.json();
}

export async function getEvmTransactions(evmAddress, network, limit = 20) {
  const res = await fetch(`${getBaseUrl(network)}/flow/evm/address/${evmAddress}/transactions?limit=${limit}`);
  return res.json();
}

export { getBaseUrl };
