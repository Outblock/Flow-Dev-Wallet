import Head from "next/head";
import styles from "../../styles/Home.module.css";
import { useEffect, useState, useContext } from "react";
import { StoreContext } from "../../contexts";
import { Card, CardContent } from "../../components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import {
  IoArrowBackOutline,
  IoGlobeOutline,
  IoServerOutline,
  IoCreateOutline,
  IoKeyOutline,
} from "react-icons/io5";
import Router from "next/router";
import fclConfig, { getDefaultRpc } from "../../utils/config";
import { set, KEYS, load } from "../../account";

const NETWORK_OPTIONS = [
  { key: "mainnet", label: "Mainnet" },
  { key: "testnet", label: "Testnet" },
  { key: "emulator", label: "Emulator" },
];

const SIG_ALGO_OPTIONS = [
  { key: "ECDSA_secp256k1", label: "ECDSA secp256k1" },
  { key: "ECDSA_P256", label: "ECDSA P256" },
];

const HASH_ALGO_OPTIONS = [
  { key: "SHA2_256", label: "SHA2-256" },
  { key: "SHA3_256", label: "SHA3-256" },
];

export default function Settings() {
  const { store, setStore } = useContext(StoreContext);
  const [selectedNetwork, setSelectedNetwork] = useState(store.network || process.env.network || "testnet");
  const [rpcUrl, setRpcUrl] = useState(store.rpcUrl || getDefaultRpc(selectedNetwork));
  const [autoSign, setAutoSign] = useState(false);
  const [sigAlgo, setSigAlgo] = useState("ECDSA_secp256k1");
  const [hashAlgo, setHashAlgo] = useState("SHA2_256");

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("settings_config") || "{}");
      if (saved.network) setSelectedNetwork(saved.network);
      if (saved.rpcUrl) setRpcUrl(saved.rpcUrl);
      if (saved.autoSign !== undefined) setAutoSign(saved.autoSign);
      if (saved.sigAlgo) setSigAlgo(saved.sigAlgo);
      if (saved.hashAlgo) setHashAlgo(saved.hashAlgo);
    } catch {}
  }, []);

  // Persist and apply network change
  const saveConfig = (overrides = {}) => {
    const config = { network: selectedNetwork, rpcUrl, autoSign, sigAlgo, hashAlgo, ...overrides };
    localStorage.setItem("settings_config", JSON.stringify(config));
  };

  const handleNetworkChange = (network) => {
    const newRpc = getDefaultRpc(network);
    setSelectedNetwork(network);
    setRpcUrl(newRpc);
    fclConfig(network, newRpc);
    setStore((s) => ({ ...s, network, rpcUrl: newRpc }));
    saveConfig({ network, rpcUrl: newRpc });
  };

  const handleRpcChange = (value) => {
    setRpcUrl(value);
    fclConfig(selectedNetwork, value);
    setStore((s) => ({ ...s, rpcUrl: value }));
    saveConfig({ rpcUrl: value });
  };

  const handleAutoSignChange = (value) => {
    setAutoSign(value);
    setStore((s) => ({ ...s, autoSign: value }));
    saveConfig({ autoSign: value });
  };

  const handleSigAlgoChange = (value) => {
    setSigAlgo(value);
    setStore((s) => ({ ...s, sigAlgo: value }));
    saveConfig({ sigAlgo: value });
  };

  const handleHashAlgoChange = (value) => {
    setHashAlgo(value);
    setStore((s) => ({ ...s, hashAlgo: value }));
    saveConfig({ hashAlgo: value });
  };

  const resetRpc = () => {
    const defaultRpc = getDefaultRpc(selectedNetwork);
    handleRpcChange(defaultRpc);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Flow Dev Wallet - Settings</title>
      </Head>
      <main className={styles.main}>
        <div className="w-1/2 min-w-[calc(max(50%,400px))] max-w-[calc(min(50%,400px))] sm:w-full py-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => Router.push("/")}
              className="h-9 w-9"
            >
              <IoArrowBackOutline className="text-xl text-gray-400" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-300">Settings</h1>
          </div>

          {/* Network */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <IoGlobeOutline className="text-xl text-blue-400" />
                <h2 className="text-base font-semibold text-gray-300">Network</h2>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="network-select">Network</Label>
                <Select value={selectedNetwork} onValueChange={handleNetworkChange}>
                  <SelectTrigger id="network-select">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORK_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* RPC Endpoint */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IoServerOutline className="text-xl text-green-400" />
                  <h2 className="text-base font-semibold text-gray-300">Access Node RPC</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={resetRpc} className="text-gray-500 text-xs">
                  Reset to default
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rpc-input">RPC Endpoint</Label>
                <Input
                  id="rpc-input"
                  value={rpcUrl}
                  onChange={(e) => handleRpcChange(e.target.value)}
                  placeholder={getDefaultRpc(selectedNetwork)}
                />
              </div>
              <p className="text-xs text-gray-600">
                Default: {getDefaultRpc(selectedNetwork)}
              </p>
            </CardContent>
          </Card>

          {/* Flow Key Algorithm */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <IoKeyOutline className="text-xl text-purple-400" />
                <div>
                  <h2 className="text-base font-semibold text-gray-300">Flow Key Algorithm</h2>
                  <p className="text-xs text-gray-500">Used when creating new wallets. Does not affect passkey (always P256).</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="sig-algo">Signature</Label>
                  <Select value={sigAlgo} onValueChange={handleSigAlgoChange}>
                    <SelectTrigger id="sig-algo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIG_ALGO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="hash-algo">Hash</Label>
                  <Select value={hashAlgo} onValueChange={handleHashAlgoChange}>
                    <SelectTrigger id="hash-algo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HASH_ALGO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Sign */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <IoCreateOutline className="text-xl text-orange-400" />
                <div className="flex flex-col grow">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-300">Auto-Sign</p>
                    {autoSign && (
                      <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                        ON
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Automatically approve transactions and sign messages without confirmation popup.
                    Useful for automated testing and development.
                  </p>
                </div>
                <Switch
                  checked={autoSign}
                  onCheckedChange={handleAutoSignChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-600">
                  Current config
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedNetwork}</Badge>
                  <Badge variant="secondary" className="max-w-[280px] truncate">{rpcUrl}</Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">{sigAlgo} + {hashAlgo}</Badge>
                  <Badge variant="secondary" className={autoSign ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : ""}>
                    auto-sign: {autoSign ? "on" : "off"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
