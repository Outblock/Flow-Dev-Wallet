import { useState, useEffect } from 'react';
import { getFlowTokens, getFlowNFTs, getEvmTokens, getEvmNFTs } from '../utils/flowindex';

function useFetchData(fetchFn, key) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!key) return;
    setLoading(true);
    setError(null);
    fetchFn(key)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [key]);

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
