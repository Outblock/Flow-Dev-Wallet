import {
  Listbox,
  ListboxItem,
  Spinner,
} from "@nextui-org/react";
import { useEvmTokens } from "../../hooks/useTokens";
import TokenItem from "./TokenItem";

const EvmTokenList = ({ evmAddress }) => {
  const { data: tokens, loading, error } = useEvmTokens(evmAddress);

  if (!evmAddress) {
    return <p className="text-sm text-gray-500 py-4 text-center">No EVM address available</p>;
  }

  if (loading) {
    return <Spinner size="sm" />;
  }

  if (error) {
    return <p className="text-sm text-red-400">Failed to load EVM tokens</p>;
  }

  const tokenList = tokens && Array.isArray(tokens) ? tokens : [];

  if (tokenList.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No EVM tokens found</p>;
  }

  return (
    <Listbox aria-label="EVM Token list" variant="flat">
      {tokenList.map((token, i) => (
        <ListboxItem key={token.symbol || i}>
          <TokenItem
            tokenInfo={{
              name: token.name || token.symbol,
              symbol: token.symbol,
              icon: token.icon || token.logo || "",
              balance: token.balance,
            }}
          />
        </ListboxItem>
      ))}
    </Listbox>
  );
};

export default EvmTokenList;
