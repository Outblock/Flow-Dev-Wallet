import { useState, useEffect, useContext } from 'react';
import { getFlowTokens, getFlowNFTs, getEvmTokens, getEvmNFTs, getFlowTransactions, getEvmTransactions } from '../utils/flowindex';
import { StoreContext } from '../contexts';

function useFetchData(fetchFn, key) {
  const { store } = useContext(StoreContext);
  const network = store?.network;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!key) return;
    setLoading(true);
    setError(null);
    fetchFn(key, network)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [key, network]);

  return { data, loading, error };
}

export function useFlowTokens(address) {
  return useFetchData(getFlowTokens, address);
}

export function useFlowNFTs(address) {
  return useFetchData(getFlowNFTs, address);
}

export function useEvmTokens(evmAddress) {
  return useFetchData(getEvmTokens, evmAddress);
}

export function useEvmNFTs(evmAddress) {
  return useFetchData(getEvmNFTs, evmAddress);
}

export function useFlowTransactions(address) {
  return useFetchData(getFlowTransactions, address);
}

export function useEvmTransactions(evmAddress) {
  return useFetchData(getEvmTransactions, evmAddress);
}
