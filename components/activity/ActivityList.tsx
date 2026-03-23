import { useContext } from "react";
import { StoreContext } from "../../contexts";
import { useFlowTransactions, useEvmTransactions } from "../../hooks/useTokens";
import { Badge } from "../ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { useState } from "react";

const formatTime = (timestamp: string | number | undefined): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
};

const truncate = (str: string | undefined, len = 16): string => {
  if (!str) return "";
  if (str.length <= len) return str;
  return str.slice(0, 8) + "..." + str.slice(-6);
};

interface FlowTx {
  id?: string;
  transaction_id?: string;
  status?: string;
  block_timestamp?: string | number;
  created_at?: string | number;
}

interface EvmTx {
  hash?: string;
  transaction_hash?: string;
  status?: string | number;
  method?: string;
  timestamp?: string | number;
  block_timestamp?: string | number;
}

const FlowActivityItem = ({ tx }: { tx: FlowTx }) => {
  const network = process.env.network || "testnet";
  const prefix = network === "testnet" ? "testnet." : "";
  const url = `https://${prefix}flowindex.io/tx/${tx.id || tx.transaction_id}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors group"
    >
      <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs shrink-0">
        {tx.status === "Sealed" ? "✓" : "⏳"}
      </div>
      <div className="flex flex-col min-w-0 grow">
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs text-gray-300 truncate">
            {truncate(tx.id || tx.transaction_id)}
          </code>
          <Badge variant="secondary" className="text-[9px] shrink-0">
            {tx.status || "Sealed"}
          </Badge>
        </div>
        <span className="text-[11px] text-gray-500">
          {formatTime(tx.block_timestamp || tx.created_at)}
        </span>
      </div>
      <span className="text-gray-600 group-hover:text-gray-400 text-xs">→</span>
    </a>
  );
};

const EvmActivityItem = ({ tx }: { tx: EvmTx }) => {
  const network = process.env.network || "testnet";
  const prefix = network === "testnet" ? "testnet." : "";
  const url = `https://${prefix}flowindex.io/evm/tx/${tx.hash || tx.transaction_hash}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors group"
    >
      <div className="h-8 w-8 rounded-full bg-purple-900/30 flex items-center justify-center text-xs shrink-0">
        {tx.status === "ok" || tx.status === 1 ? "✓" : "⏳"}
      </div>
      <div className="flex flex-col min-w-0 grow">
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs text-gray-300 truncate">
            {truncate(tx.hash || tx.transaction_hash)}
          </code>
          {tx.method && (
            <Badge variant="secondary" className="text-[9px] bg-purple-500/15 text-purple-400 shrink-0">
              {tx.method}
            </Badge>
          )}
        </div>
        <span className="text-[11px] text-gray-500">
          {formatTime(tx.timestamp || tx.block_timestamp)}
        </span>
      </div>
      <span className="text-gray-600 group-hover:text-gray-400 text-xs">→</span>
    </a>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-2 py-8">
    <span className="text-2xl">📭</span>
    <p className="text-xs text-gray-500">{message}</p>
  </div>
);

const Spinner = () => (
  <div className="flex justify-center py-6">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-[#00EF8B]" />
  </div>
);

const ActivityList = () => {
  const { store } = useContext(StoreContext);
  const evmAddress = store.keyInfo?.evmAddress;
  const [chainTab, setChainTab] = useState("flow");

  const { data: flowTxs, loading: flowLoading, error: flowError } = useFlowTransactions(store.address);
  const { data: evmTxs, loading: evmLoading, error: evmError } = useEvmTransactions(evmAddress);

  const flowList: FlowTx[] = (flowTxs as any)?.data || (flowTxs as any)?.transactions || (Array.isArray(flowTxs) ? flowTxs : []);
  const evmList: EvmTx[] = (evmTxs as any)?.data || (evmTxs as any)?.items || (Array.isArray(evmTxs) ? evmTxs : []);

  return (
    <div className="flex flex-col gap-2">
      {evmAddress && (
        <Tabs value={chainTab} onValueChange={setChainTab}>
          <TabsList className="bg-transparent gap-4 h-8 p-0">
            <TabsTrigger value="flow" className="px-2 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Flow
            </TabsTrigger>
            <TabsTrigger value="evm" className="px-2 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              EVM
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {chainTab === "flow" ? (
        <>
          {flowLoading && <Spinner />}
          {flowError && <p className="text-xs text-red-400 px-3">Failed to load activity</p>}
          {!flowLoading && flowList.length === 0 && <EmptyState message="No Flow transactions yet" />}
          <div className="flex flex-col">
            {flowList.slice(0, 20).map((tx, i) => (
              <FlowActivityItem key={tx.id || tx.transaction_id || i} tx={tx} />
            ))}
          </div>
        </>
      ) : (
        <>
          {evmLoading && <Spinner />}
          {evmError && <p className="text-xs text-red-400 px-3">Failed to load activity</p>}
          {!evmLoading && evmList.length === 0 && <EmptyState message="No EVM transactions yet" />}
          <div className="flex flex-col">
            {evmList.slice(0, 20).map((tx, i) => (
              <EvmActivityItem key={tx.hash || tx.transaction_hash || i} tx={tx} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityList;
