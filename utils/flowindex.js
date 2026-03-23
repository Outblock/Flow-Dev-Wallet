const BASE_URL = process.env.flowindexUrl || 'https://flowindex.io/api';

export async function getFlowAccount(address) {
  const res = await fetch(`${BASE_URL}/flow/account/${address}`);
  return res.json();
}

export async function getFlowTokens(address) {
  const res = await fetch(`${BASE_URL}/flow/account/${address}/ft`);
  return res.json();
}

export async function getFlowNFTs(address) {
  const res = await fetch(`${BASE_URL}/flow/account/${address}/nft`);
  return res.json();
}

export async function getEvmTokens(evmAddress) {
  const res = await fetch(`${BASE_URL}/flow/evm/address/${evmAddress}/token`);
  return res.json();
}

export async function getEvmNFTs(evmAddress) {
  const res = await fetch(`${BASE_URL}/flow/evm/address/${evmAddress}/nft`);
  return res.json();
}

export async function getEvmBalance(evmAddress) {
  const res = await fetch(`${BASE_URL}/flow/evm/address/${evmAddress}`);
  return res.json();
}
