import { useContext } from "react";
import { StoreContext } from "../../contexts";
import { useFlowTokens } from "../../hooks/useTokens";
import TokenItem from "./TokenItem";

const flowTokenInfo = {
  name: "Flow",
  symbol: "FLOW",
  icon: "https://github.com/Outblock/Assets/blob/main/ft/flow/logo.png?raw=true",
};

const TokenList = () => {
  const { store } = useContext(StoreContext);
  const { data: tokens, loading, error } = useFlowTokens(store.address);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">Failed to load tokens</p>;
  }

  const tokenList = tokens?.data || (Array.isArray(tokens) ? tokens : []);

  return (
    <div role="listbox" aria-label="Token list" className="flex flex-col">
      {tokenList.length > 0 ? (
        tokenList.map((token: any, i: number) => (
          <div
            key={token.symbol || i}
            role="option"
            className="px-3 py-1 rounded-md hover:bg-accent transition-colors cursor-default"
          >
            <TokenItem
              tokenInfo={{
                name: token.name || token.symbol,
                symbol: token.symbol,
                icon: token.icon || flowTokenInfo.icon,
                balance: token.balance,
              }}
            />
          </div>
        ))
      ) : (
        <div className="px-3 py-1 rounded-md hover:bg-accent transition-colors cursor-default">
          <TokenItem tokenInfo={flowTokenInfo} />
        </div>
      )}
    </div>
  );
};

export default TokenList;
