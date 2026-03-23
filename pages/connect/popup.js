import {
  Button,
  Card,
  CardBody,
  Chip,
  Spinner,
} from "@nextui-org/react";
import { StoreContext } from "../../contexts";
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { getEvmChain } from "../../utils/evm";
import styles from "../../styles/Home.module.css";
import Head from "next/head";

const EVMPopup = () => {
  const { store } = useContext(StoreContext);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [status, setStatus] = useState("idle");
  const autoProcessed = useRef(new Set());

  const chain = getEvmChain(store.network);

  const postToOpener = useCallback((type, data) => {
    const target = window.opener || window.parent;
    if (!target) return;
    target.postMessage({ type, ...data }, "*");
  }, []);

  // On mount, send ready/connected if account exists
  useEffect(() => {
    if (store.keyInfo?.evmAddress) {
      postToOpener("flowindex_connected", {
        address: store.keyInfo.evmAddress,
        chainId: chain.chainId,
      });
    }
    postToOpener("flowindex_ready", {
      address: store.keyInfo?.evmAddress || null,
      chainId: chain.chainId,
    });
  }, [store.keyInfo?.evmAddress, chain.chainId, postToOpener]);

  // Listen for RPC requests from dApp
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type !== "flowindex_rpc_request") return;
      const { id, method, params } = event.data;
      console.log("[evm-popup] rpc request:", method, id);

      const signingMethods = [
        "eth_sendTransaction",
        "personal_sign",
        "eth_signTypedData_v4",
      ];

      if (signingMethods.includes(method)) {
        if (store.autoSign && !autoProcessed.current.has(id)) {
          autoProcessed.current.add(id);
          handleRpc(id, method, params);
        } else {
          setPendingRequest({ id, method, params });
        }
      } else {
        // Read-only methods: proxy to RPC
        handleRpc(id, method, params);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [store.autoSign, store.keyInfo?.pk, chain]);

  const handleRpc = async (id, method, params) => {
    setStatus("processing");
    try {
      const result = await executeRpc(method, params);
      postToOpener("flowindex_rpc_response", { id, result });
    } catch (err) {
      console.error("[evm-popup] rpc error:", err);
      postToOpener("flowindex_rpc_response", {
        id,
        error: { code: err.code || -32603, message: err.message || "Internal error" },
      });
    }
    setPendingRequest(null);
    setStatus("idle");
  };

  const executeRpc = async (method, params) => {
    const { createWalletClient, createPublicClient, http } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    const viemChain = {
      id: chain.chainId,
      name: chain.name,
      nativeCurrency: { name: "FLOW", symbol: "FLOW", decimals: 18 },
      rpcUrls: { default: { http: [chain.rpcUrl] } },
    };

    const account = privateKeyToAccount(`0x${store.keyInfo.pk}`);

    switch (method) {
      case "eth_sendTransaction": {
        const client = createWalletClient({
          account,
          chain: viemChain,
          transport: http(chain.rpcUrl),
        });
        const tx = { ...params[0] };
        if (tx.gas) {
          tx.gas = BigInt(tx.gas);
        }
        if (tx.value) {
          tx.value = BigInt(tx.value);
        }
        if (tx.gasPrice) {
          tx.gasPrice = BigInt(tx.gasPrice);
        }
        if (tx.maxFeePerGas) {
          tx.maxFeePerGas = BigInt(tx.maxFeePerGas);
        }
        if (tx.maxPriorityFeePerGas) {
          tx.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas);
        }
        return await client.sendTransaction(tx);
      }

      case "personal_sign": {
        const message =
          typeof params[0] === "string" && params[0].startsWith("0x")
            ? { raw: params[0] }
            : params[0];
        return await account.signMessage({ message });
      }

      case "eth_signTypedData_v4": {
        const typedData =
          typeof params[1] === "string" ? JSON.parse(params[1]) : params[1];
        return await account.signTypedData(typedData);
      }

      default: {
        // Proxy read-only methods to RPC
        const publicClient = createPublicClient({
          chain: viemChain,
          transport: http(chain.rpcUrl),
        });
        const result = await publicClient.request({ method, params });
        return result;
      }
    }
  };

  const onApprove = () => {
    if (!pendingRequest) return;
    const { id, method, params } = pendingRequest;
    handleRpc(id, method, params);
  };

  const onReject = () => {
    if (!pendingRequest) return;
    postToOpener("flowindex_rpc_response", {
      id: pendingRequest.id,
      error: { code: 4001, message: "User rejected request" },
    });
    setPendingRequest(null);
  };

  // No account loaded
  if (!store.keyInfo?.evmAddress) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Flow Dev Wallet - EVM</title>
        </Head>
        <main className={styles.main}>
          <Card className="w-80">
            <CardBody className="flex flex-col items-center gap-4 p-8">
              <h2 className="text-xl font-bold">No Wallet Loaded</h2>
              <p className="text-gray-400 text-center text-sm">
                Open the wallet main page first and import a key.
              </p>
              <Button
                color="primary"
                onPress={() => window.open(window.location.origin, "_blank")}
              >
                Open Wallet
              </Button>
            </CardBody>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Flow Dev Wallet - EVM</title>
      </Head>
      <main className={styles.main}>
        <div className="w-80 flex flex-col gap-4">
          {/* Connected status */}
          <Card>
            <CardBody className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-200">EVM Wallet</h2>
                <Chip color="success" size="sm" variant="flat">Connected</Chip>
              </div>
              <div className="bg-zinc-800 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <p className="text-xs font-mono text-gray-300 break-all">
                  {store.keyInfo.evmAddress}
                </p>
              </div>
              <div className="flex gap-2">
                <Chip size="sm" variant="flat">{chain.name}</Chip>
                <Chip size="sm" variant="flat">Chain {chain.chainId}</Chip>
              </div>
              {store.autoSign && (
                <Chip color="warning" size="sm" variant="flat">Auto-sign enabled</Chip>
              )}
            </CardBody>
          </Card>

          {/* Pending request approval */}
          {pendingRequest && !store.autoSign && (
            <Card>
              <CardBody className="flex flex-col gap-3 p-5">
                <h3 className="text-sm font-bold text-gray-300">Signature Request</h3>
                <div className="bg-zinc-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Method</p>
                  <p className="text-sm font-mono text-gray-300">
                    {pendingRequest.method}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg px-3 py-2 max-h-32 overflow-auto">
                  <p className="text-xs text-gray-500 mb-1">Params</p>
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(pendingRequest.params, null, 2)}
                  </pre>
                </div>
                <div className="flex gap-3">
                  <Button
                    color="default"
                    className="flex-1 h-10"
                    onPress={onReject}
                  >
                    Reject
                  </Button>
                  <Button
                    color="primary"
                    variant="solid"
                    className="flex-1 h-10"
                    onPress={onApprove}
                  >
                    Approve
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Processing indicator */}
          {status === "processing" && (
            <Card>
              <CardBody className="flex flex-row items-center justify-center gap-3 p-4">
                <Spinner size="sm" />
                <span className="text-sm text-gray-400">Processing request...</span>
              </CardBody>
            </Card>
          )}

          {/* Idle state */}
          {!pendingRequest && status === "idle" && (
            <Card>
              <CardBody className="flex flex-col items-center gap-2 p-4">
                <p className="text-sm text-gray-500">Waiting for dApp requests...</p>
              </CardBody>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default EVMPopup;
