import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { StoreContext } from "../contexts";
import { useState, useContext } from "react";
import { LuCopy, LuLogOut, LuArrowUpRight, LuArrowDownLeft, LuArrowLeftRight, LuWallet, LuList, LuBox, LuSettings } from "react-icons/lu";
import SignOut from "./sign/SignOut";
import Setting from "./setting/Setting";
import TokenList from "./token/TokenList";
import EvmTokenList from "./token/EvmTokenList";
import ActivityList from "./activity/ActivityList";
import toast from "react-hot-toast";
import { IconType } from "react-icons";

interface WalletCardProps {
  address: string;
}

interface TabItem {
  id: string;
  icon: IconType;
  label: string;
}

const WalletCard = ({ address }: WalletCardProps) => {
  const { store } = useContext(StoreContext);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tokens");
  const [chainTab, setChainTab] = useState("flow");

  const evmAddress = store.keyInfo?.evmAddress;
  const smartWalletAddress = store.keyInfo?.smartWalletAddress;
  const network = store.network || "testnet";

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Copied!");
  };

  const TAB_ITEMS: TabItem[] = [
    { id: "tokens", icon: LuWallet, label: "Tokens" },
    { id: "activity", icon: LuList, label: "Activity" },
    { id: "nfts", icon: LuBox, label: "NFTs" },
    { id: "settings", icon: LuSettings, label: "Settings" },
  ];

  return (
    <Card className="flex flex-col w-full h-[85vh] max-h-[700px] border-zinc-800/60 bg-zinc-900/80 overflow-hidden">
      <SignOut isOpen={signOutOpen} onOpen={() => setSignOutOpen(true)} onOpenChange={setSignOutOpen} />

      {/* ═══ Header ═══ */}
      <div className="flex flex-col gap-3 p-4 pb-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">Flow Dev Wallet</span>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-mono">
              {network}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-red-400"
            onClick={() => setSignOutOpen(true)}
          >
            <LuLogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Address card */}
        <Card className="border-zinc-800/60 bg-zinc-900/40">
          <CardContent className="p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono px-1.5">Flow</Badge>
              <code className="font-mono text-[11px] text-zinc-400 truncate flex-1">{address}</code>
              <button onClick={() => copyAddr(address)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                <LuCopy className="h-3 w-3" />
              </button>
            </div>
            {evmAddress && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono px-1.5">EVM</Badge>
                <code className="font-mono text-[11px] text-zinc-400 truncate flex-1">{evmAddress}</code>
                <button onClick={() => copyAddr(evmAddress)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <LuCopy className="h-3 w-3" />
                </button>
              </div>
            )}
            {smartWalletAddress && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 font-mono px-1.5">4337</Badge>
                <code className="font-mono text-[11px] text-zinc-400 truncate flex-1">{smartWalletAddress}</code>
                <button onClick={() => copyAddr(smartWalletAddress)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <LuCopy className="h-3 w-3" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons — compact row */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { icon: LuArrowUpRight, label: "Send" },
            { icon: LuArrowDownLeft, label: "Receive" },
            { icon: LuArrowLeftRight, label: "Swap" },
            { icon: LuWallet, label: "Buy" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => toast("Coming Soon", { icon: "🚧" })}
              className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30 hover:bg-zinc-700/50 hover:border-zinc-600/40 transition-all text-zinc-400 hover:text-zinc-200"
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="opacity-30 mx-4" />

      {/* ═══ Content — scrollable ═══ */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2 px-4">
        {activeTab === "tokens" && (
          <div className="flex flex-col gap-1">
            {evmAddress && (
              <div className="flex gap-3 px-1 pb-2">
                <button
                  onClick={() => setChainTab("flow")}
                  className={`text-xs font-medium pb-1 border-b-2 transition-colors ${chainTab === "flow" ? "border-emerald-500 text-zinc-200" : "border-transparent text-zinc-500 hover:text-zinc-400"}`}
                >
                  Flow
                </button>
                <button
                  onClick={() => setChainTab("evm")}
                  className={`text-xs font-medium pb-1 border-b-2 transition-colors ${chainTab === "evm" ? "border-purple-500 text-zinc-200" : "border-transparent text-zinc-500 hover:text-zinc-400"}`}
                >
                  EVM
                </button>
              </div>
            )}
            {chainTab === "flow" ? <TokenList /> : <EvmTokenList evmAddress={evmAddress} />}
          </div>
        )}

        {activeTab === "activity" && <ActivityList />}

        {activeTab === "nfts" && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <LuBox className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">NFTs coming soon</p>
          </div>
        )}

        {activeTab === "settings" && <Setting />}
      </div>

      {/* ═══ Bottom tab bar — fixed ═══ */}
      <div className="pt-2 pb-2 px-4 border-t border-zinc-800/40">
        <div className="grid grid-cols-4">
          {TAB_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                activeTab === id
                  ? "text-emerald-400"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[9px] font-medium uppercase tracking-wider">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default WalletCard;
