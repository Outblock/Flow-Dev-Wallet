import {
    Listbox,
    ListboxItem,
    Spinner
  } from "@nextui-org/react";
  import { useContext } from "react";
  import { StoreContext } from "../../contexts";
  import { useFlowTokens } from "../../hooks/useTokens";
  import TokenItem from "./TokenItem"

  const flowTokenInfo = {
    name: "Flow",
    symbol: "FLOW",
    icon: "https://github.com/Outblock/Assets/blob/main/ft/flow/logo.png?raw=true",
  }

  const TokenList = () => {
    const { store } = useContext(StoreContext);
    const { data: tokens, loading, error } = useFlowTokens(store.address);

    if (loading) {
      return <Spinner size="sm" />;
    }

    if (error) {
      return <p className="text-sm text-red-400">Failed to load tokens</p>;
    }

    const tokenList = tokens && Array.isArray(tokens) ? tokens : [];

    return (
        <Listbox
          aria-label="Token list"
          variant="flat"
        >
          {tokenList.length > 0 ? (
            tokenList.map((token, i) => (
              <ListboxItem key={token.symbol || i}>
                <TokenItem tokenInfo={{
                  name: token.name || token.symbol,
                  symbol: token.symbol,
                  icon: token.icon || flowTokenInfo.icon,
                  balance: token.balance,
                }} />
              </ListboxItem>
            ))
          ) : (
            <ListboxItem key="flow">
              <TokenItem tokenInfo={flowTokenInfo} />
            </ListboxItem>
          )}
        </Listbox>
    );
  };

  export default TokenList;
