import { Card, CardContent, CardFooter, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Separator } from "../components/ui/separator";
import { StoreContext } from "../contexts";
import { useState, useContext } from "react";
import { FaWallet } from "react-icons/fa";
import KeyInfoCard from "./setting/KeyInfoCard";
import * as fcl from "@onflow/fcl";
import { IoExitOutline } from "react-icons/io5";
import { LuCopy } from "react-icons/lu";
import {
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoAddOutline,
  IoSwapHorizontalOutline,
} from "react-icons/io5";
import SignOut from "./sign/SignOut";
import { CustomTab } from "./tab/CustomTab";
import Setting from "./setting/Setting";
import TokenList from "./token/TokenList";
import EvmTokenList from "./token/EvmTokenList";
import { IoCardOutline } from "react-icons/io5";
import { isEnableBiometric } from "../account";
import { TAB } from "./tab/Tab";
import toast from "react-hot-toast";

const WalletCard = ({ address }) => {
  const { store, setStore } = useContext(StoreContext);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [selected, setSelected] = useState("Token");
  const [chainTab, setChainTab] = useState("flow");

  const evmAddress = store.keyInfo?.evmAddress;

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    toast.success("Copied!");
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-col w-full gap-4 px-6 pt-6 pb-0 space-y-0">
        <div className="flex items-center gap-4 w-full">
          <FaWallet className="text-2xl" />
          <h1 className="text-3xl font-bold text-gray-300">Flow Wallet</h1>
          <div className="grow" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Exit"
                  onClick={() => setSignOutOpen(true)}
                >
                  <IoExitOutline className="text-2xl text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Log out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Card className="w-full">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-6">
              <Avatar className={`h-10 w-10 ${process.env.network !== "mainnet" ? "ring-2 ring-green-500" : ""}`}>
                <AvatarFallback className="text-2xl bg-yellow-500">🤑</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start gap-2 grow min-w-0">
                <div className="flex gap-2 items-center">
                  <h1 className="font-bold">{store.username || "Name"}</h1>
                  {process.env.network !== "mainnet" && (
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 uppercase text-xs">
                      {process.env.network}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full">
                  <Badge className="text-xs bg-blue-500/15 text-blue-400 border-blue-500/30">Flow</Badge>
                  <code className="font-mono text-sm text-gray-400 truncate">{store.address}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyAddress(store.address)}
                  >
                    <LuCopy className="text-sm" />
                  </Button>
                </div>
                {evmAddress && (
                  <div className="flex items-center gap-2 w-full">
                    <Badge variant="secondary" className="text-xs bg-purple-500/15 text-purple-400 border-purple-500/30">EVM</Badge>
                    <code className="font-mono text-sm text-gray-400 truncate">{evmAddress}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyAddress(evmAddress)}
                    >
                      <LuCopy className="text-sm" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center w-full gap-4">
          <div className="flex basis-3/4 w-full grow gap-0">
            <Button className="w-full rounded-r-none" onClick={() => toast('Coming Soon', {icon: '🚧'})}>
              <IoArrowUpOutline className="text-lg" />
              <p className="hidden sm:block">Send</p>
            </Button>
            <Button className="w-full rounded-none border-x-0" onClick={() => toast('Coming Soon', {icon: '🚧'})}>
              <IoSwapHorizontalOutline className="text-lg" />
              <p className="hidden sm:block">Swap</p>
            </Button>
            <Button className="w-full rounded-l-none" onClick={() => toast('Coming Soon', {icon: '🚧'})}>
              <IoArrowDownOutline className="text-lg" />
              <p className="hidden sm:block">Receive</p>
            </Button>
          </div>

          <Button
            className="basis-1/4 w-full"
            onClick={() => toast('Coming Soon', {icon: '🚧'})}
          >
            <IoCardOutline className="text-lg" />
            <p className="hidden sm:block">Buy</p>
          </Button>
        </div>

        <Separator />
      </CardHeader>

      <CardContent className="flex flex-col px-6 p-2">
        <SignOut isOpen={signOutOpen} onOpen={() => setSignOutOpen(true)} onOpenChange={setSignOutOpen} />
        <Tabs
          value={selected}
          onValueChange={setSelected}
          className="hidden"
        >
          <TabsList className="w-full">
            {TAB.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="flex-1">
                {item.id}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="Token" className="!mt-0 h-full py-0">
            <div className="flex flex-col gap-2 h-full">
              {evmAddress && (
                <Tabs
                  value={chainTab}
                  onValueChange={setChainTab}
                >
                  <TabsList className="bg-transparent gap-4 h-8 p-0">
                    <TabsTrigger value="flow" className="px-2 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Flow</TabsTrigger>
                    <TabsTrigger value="evm" className="px-2 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">EVM</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
              {chainTab === "flow" ? (
                <TokenList />
              ) : (
                <EvmTokenList evmAddress={evmAddress} />
              )}
            </div>
          </TabsContent>
          <TabsContent value="NFT" className="!mt-0 h-full py-0">
            <p> This is a NFT Tab </p>
          </TabsContent>
          <TabsContent value="Setting" className="!mt-0 h-full py-0">
            <Setting />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="w-full">
        <CustomTab selected={selected} setSelected={setSelected} />
      </CardFooter>
    </Card>
  );
};

export default WalletCard;
