import { useState, useEffect, useContext } from 'react';
import { getFlowTokens, getFlowNFTs, getEvmTokens, getEvmNFTs, getFlowTransactions, getEvmTransactions } from '../utils/flowindex';
import { StoreContext } from '../contexts';

interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useFetchData<T>(fetchFn: (key: string, network?: string) => Promise<T>, key: string | null | undefined): FetchResult<T> {
  const { store } = useContext(StoreContext) as { store?: { network?: string; [key: string]: unknown } };
  const network = store?.network;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

export function useFlowTokens(address: string | null | undefined) {
  return useFetchData(getFlowTokens, address);
}

export function useFlowNFTs(address: string | null | undefined) {
  return useFetchData(getFlowNFTs, address);
}

export function useEvmTokens(evmAddress: string | null | undefined) {
  return useFetchData(getEvmTokens, evmAddress);
}

export function useEvmNFTs(evmAddress: string | null | undefined) {
  return useFetchData(getEvmNFTs, evmAddress);
}

export function useFlowTransactions(address: string | null | undefined) {
  return useFetchData(getFlowTransactions, address);
}

export function useEvmTransactions(evmAddress: string | null | undefined) {
  return useFetchData(getEvmTransactions, evmAddress);
}
