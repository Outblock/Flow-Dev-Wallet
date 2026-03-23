import Head from "next/head";
import styles from "../../styles/Home.module.css";
import { useEffect, useState, useContext } from "react";
import { StoreContext } from "../../contexts";
import {
  Card,
  CardBody,
  Select,
  SelectItem,
  Input,
  Switch,
  Button,
  Chip,
} from "@nextui-org/react";
import {
  IoArrowBackOutline,
  IoGlobeOutline,
  IoServerOutline,
  IoCreateOutline,
} from "react-icons/io5";
import Router from "next/router";
import fclConfig, { getDefaultRpc } from "../../utils/config";
import { set, KEYS, load } from "../../account";

const NETWORK_OPTIONS = [
  { key: "mainnet", label: "Mainnet" },
  { key: "testnet", label: "Testnet" },
  { key: "emulator", label: "Emulator" },
];

export default function Settings() {
  const { store, setStore } = useContext(StoreContext);
  const [selectedNetwork, setSelectedNetwork] = useState(store.network || process.env.network || "testnet");
  const [rpcUrl, setRpcUrl] = useState(store.rpcUrl || getDefaultRpc(selectedNetwork));
  const [autoSign, setAutoSign] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("settings_config") || "{}");
      if (saved.network) setSelectedNetwork(saved.network);
      if (saved.rpcUrl) setRpcUrl(saved.rpcUrl);
      if (saved.autoSign !== undefined) setAutoSign(saved.autoSign);
    } catch {}
  }, []);

  // Persist and apply network change
  const handleNetworkChange = (network) => {
    const newRpc = getDefaultRpc(network);
    setSelectedNetwork(network);
    setRpcUrl(newRpc);
    fclConfig(network, newRpc);
    setStore((s) => ({ ...s, network, rpcUrl: newRpc }));
    saveConfig({ network, rpcUrl: newRpc, autoSign });
  };

  // Persist and apply RPC change
  const handleRpcChange = (value) => {
    setRpcUrl(value);
    fclConfig(selectedNetwork, value);
    setStore((s) => ({ ...s, rpcUrl: value }));
    saveConfig({ network: selectedNetwork, rpcUrl: value, autoSign });
  };

  // Persist and apply auto-sign change
  const handleAutoSignChange = (value) => {
    setAutoSign(value);
    setStore((s) => ({ ...s, autoSign: value }));
    saveConfig({ network: selectedNetwork, rpcUrl, autoSign: value });
  };

  const saveConfig = (config) => {
    localStorage.setItem("settings_config", JSON.stringify(config));
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
              isIconOnly
              variant="light"
              onPress={() => Router.push("/")}
              size="sm"
            >
              <IoArrowBackOutline className="text-xl text-gray-400" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-300">Settings</h1>
          </div>

          {/* Network */}
          <Card>
            <CardBody className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <IoGlobeOutline className="text-xl text-blue-400" />
                <h2 className="text-base font-semibold text-gray-300">Network</h2>
              </div>
              <Select
                label="Network"
                selectedKeys={[selectedNetwork]}
                onChange={(e) => handleNetworkChange(e.target.value)}
                size="sm"
              >
                {NETWORK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </Select>
            </CardBody>
          </Card>

          {/* RPC Endpoint */}
          <Card>
            <CardBody className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IoServerOutline className="text-xl text-green-400" />
                  <h2 className="text-base font-semibold text-gray-300">Access Node RPC</h2>
                </div>
                <Button size="sm" variant="light" onPress={resetRpc} className="text-gray-500 text-xs">
                  Reset to default
                </Button>
              </div>
              <Input
                label="RPC Endpoint"
                value={rpcUrl}
                onValueChange={handleRpcChange}
                size="sm"
                variant="bordered"
                placeholder={getDefaultRpc(selectedNetwork)}
              />
              <p className="text-xs text-gray-600">
                Default: {getDefaultRpc(selectedNetwork)}
              </p>
            </CardBody>
          </Card>

          {/* Auto-Sign */}
          <Card>
            <CardBody className="p-5">
              <div className="flex items-center gap-4">
                <IoCreateOutline className="text-xl text-orange-400" />
                <div className="flex flex-col grow">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-300">Auto-Sign</p>
                    {autoSign && (
                      <Chip color="warning" size="sm" variant="flat" className="text-xs">
                        ON
                      </Chip>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Automatically approve transactions and sign messages without confirmation popup.
                    Useful for automated testing and development.
                  </p>
                </div>
                <Switch
                  isSelected={autoSign}
                  onValueChange={handleAutoSignChange}
                  color="warning"
                />
              </div>
            </CardBody>
          </Card>

          {/* Info */}
          <Card>
            <CardBody className="p-5">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-600">
                  Current config
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip size="sm" variant="flat">{selectedNetwork}</Chip>
                  <Chip size="sm" variant="flat" className="max-w-[280px] truncate">{rpcUrl}</Chip>
                  <Chip size="sm" variant="flat" color={autoSign ? "warning" : "default"}>
                    auto-sign: {autoSign ? "on" : "off"}
                  </Chip>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}
