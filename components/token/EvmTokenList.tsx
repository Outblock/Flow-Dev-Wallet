import { useEvmTokens } from "../../hooks/useTokens";
import TokenItem from "./TokenItem";

interface EvmTokenListProps {
  evmAddress: string | undefined;
}

const EvmTokenList = ({ evmAddress }: EvmTokenListProps) => {
  const { data: tokens, loading, error } = useEvmTokens(evmAddress);

  if (!evmAddress) {
    return <p className="text-sm text-gray-500 py-4 text-center">No EVM address available</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">Failed to load EVM tokens</p>;
  }

  const tokenList = tokens && Array.isArray(tokens) ? tokens : [];

  if (tokenList.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No EVM tokens found</p>;
  }

  return (
    <div role="listbox" aria-label="EVM Token list" className="flex flex-col">
      {tokenList.map((token: any, i: number) => (
        <div
          key={token.symbol || i}
          role="option"
          className="px-3 py-1 rounded-md hover:bg-accent transition-colors cursor-default"
        >
          <TokenItem
            tokenInfo={{
              name: token.name || token.symbol,
              symbol: token.symbol,
              icon: token.icon || token.logo || "",
              balance: token.balance,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default EvmTokenList;
