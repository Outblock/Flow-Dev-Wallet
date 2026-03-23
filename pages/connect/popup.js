import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { StoreContext } from "../../contexts";
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { getEvmChain } from "../../utils/evm";
import { handleEvmRpc } from "../../utils/evmSigner";
import { FaCircleCheck } from "react-icons/fa6";
import { RiGlobalLine } from "react-icons/ri";
import { shouldAutoSign } from "../../utils/autoSign";
import styles from "../../styles/Home.module.css";
import Head from "next/head";

const EVMPopup = () => {
  const { store } = useContext(StoreContext);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [status, setStatus] = useState("idle");
  // "connect" = waiting for user to approve connection
  // "connected" = user approved, listening for RPC requests
  // If opened with ?action=sign, skip connect phase (already connected)
  const [phase, setPhase] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "sign") return "connected";
    }
    return "connect";
  });
  const autoProcessed = useRef(new Set());

  const chain = getEvmChain(store.network);
  const evmAddress = store.keyInfo?.evmAddress;
  const dAppOrigin = typeof window !== "undefined"
    ? (document.referrer ? new URL(document.referrer).hostname : "localhost")
    : "localhost";

  const postToOpener = useCallback((type, data) => {
    const target = window.opener || window.parent;
    if (!target) return;
    target.postMessage({ type, ...data }, "*");
  }, []);

  // On mount, send ready. If already connected (action=sign), include address.
  useEffect(() => {
    if (phase === "connected" && evmAddress) {
      postToOpener("flowindex_ready", {
        address: evmAddress,
        chainId: chain.chainId,
      });
    } else {
      postToOpener("flowindex_ready", {
        address: null,
        chainId: chain.chainId,
      });
    }
  }, [chain.chainId, postToOpener]);

  // Auto-approve connection when autoSign is enabled
  useEffect(() => {
    if (phase === "connect" && shouldAutoSign(store, dAppOrigin) && evmAddress) {
      onApproveConnect();
    }
  }, [phase, store.autoSign, evmAddress]);

  // Listen for RPC requests from dApp (only after connected)
  useEffect(() => {
    if (phase !== "connected") return;

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
        if (shouldAutoSign(store, dAppOrigin) && !autoProcessed.current.has(id)) {
          autoProcessed.current.add(id);
          handleRpc(id, method, params);
        } else {
          setPendingRequest({ id, method, params });
        }
      } else {
        handleRpc(id, method, params);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [phase, store.autoSign, store.keyInfo?.pk, chain]);

  const onApproveConnect = () => {
    postToOpener("flowindex_connected", {
      address: evmAddress,
      chainId: chain.chainId,
    });
    setPhase("connected");
    // Auto-close after connection — dApp will re-open for signing
    setTimeout(() => window.close(), 300);
  };

  const onRejectConnect = () => {
    postToOpener("flowindex_disconnected", {});
    window.close();
  };

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
    // Close popup after signing completes — dApp will re-open if needed
    setTimeout(() => window.close(), 300);
  };

  const executeRpc = async (method, params) => {
    return handleEvmRpc(method, params, store.keyInfo, store.network);
  };

  const onApproveRpc = () => {
    if (!pendingRequest) return;
    const { id, method, params } = pendingRequest;
    handleRpc(id, method, params);
  };

  const onRejectRpc = () => {
    if (!pendingRequest) return;
    postToOpener("flowindex_rpc_response", {
      id: pendingRequest.id,
      error: { code: 4001, message: "User rejected request" },
    });
    setPendingRequest(null);
  };

  // dAppOrigin is defined at the top of the component

  // No account loaded
  if (!evmAddress) {
    return (
      <div className={styles.container}>
        <Head><title>Flow Dev Wallet - EVM</title></Head>
        <main className={styles.main}>
          <Card className="w-80 border-zinc-800 bg-zinc-900/90">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <h2 className="text-xl font-bold">No Wallet Loaded</h2>
              <p className="text-gray-400 text-center text-sm">
                Open the wallet main page first and import a key.
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => window.open(window.location.origin, "_blank")}
              >
                Open Wallet
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Phase 1: Connection approval (like Flow authn)
  if (phase === "connect") {
    return (
      <div className={styles.container}>
        <Head><title>Flow Dev Wallet - EVM Connect</title></Head>
        <main className={styles.main}>
          <Card className="w-80 border-zinc-800 bg-zinc-900/90">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-sm font-bold text-gray-500">Connecting to</h1>
                <h1 className="text-xl font-bold text-gray-200">EVM dApp</h1>
              </div>

              <Card className="border-zinc-800 bg-zinc-800/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <RiGlobalLine className="text-lg text-blue-100" />
                    <span className="text-sm text-blue-100">{dAppOrigin}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-zinc-800/50">
                <CardContent className="p-3">
                  <p className="text-xs text-gray-500 uppercase mb-2">This App would like to</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <FaCircleCheck className="text-emerald-500 shrink-0" />
                      <p className="text-sm">View your EVM wallet address</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCircleCheck className="text-emerald-500 shrink-0" />
                      <p className="text-sm">Request approval for transactions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500">Account:</span>
                <span className="text-xs font-mono text-gray-300 truncate">{evmAddress}</span>
              </div>

              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-zinc-800 text-gray-400 text-xs">{chain.name}</Badge>
                <Badge variant="secondary" className="bg-zinc-800 text-gray-400 text-xs">Chain {chain.chainId}</Badge>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 border-zinc-700 hover:bg-zinc-800"
                  onClick={onRejectConnect}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={onApproveConnect}
                >
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Phase 2: Connected — handle RPC signing requests
  return (
    <div className={styles.container}>
      <Head><title>Flow Dev Wallet - EVM</title></Head>
      <main className={styles.main}>
        <div className="w-80 flex flex-col gap-4">
          {/* Connected status */}
          <Card className="border-zinc-800 bg-zinc-900/90">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-200">EVM Wallet</h2>
                <Badge variant="outline" className="border-emerald-600 text-emerald-500 bg-emerald-950/30">Connected</Badge>
              </div>
              <div className="bg-zinc-800 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <p className="text-xs font-mono text-gray-300 break-all">{evmAddress}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-zinc-800 text-gray-300">{chain.name}</Badge>
                <Badge variant="secondary" className="bg-zinc-800 text-gray-300">Chain {chain.chainId}</Badge>
              </div>
              {shouldAutoSign(store) && (
                <Badge variant="outline" className="w-fit border-yellow-600 text-yellow-500 bg-yellow-950/30">Auto-sign enabled</Badge>
              )}
            </CardContent>
          </Card>

          {/* Pending request approval */}
          {pendingRequest && !shouldAutoSign(store) && (
            <Card className="border-zinc-800 bg-zinc-900/90">
              <CardContent className="flex flex-col gap-3 p-5">
                <h3 className="text-sm font-bold text-gray-300">Signature Request</h3>
                <div className="bg-zinc-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Method</p>
                  <p className="text-sm font-mono text-gray-300">{pendingRequest.method}</p>
                </div>
                <div className="bg-zinc-800 rounded-lg px-3 py-2 max-h-32 overflow-auto">
                  <p className="text-xs text-gray-500 mb-1">Params</p>
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(pendingRequest.params, null, 2)}
                  </pre>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 border-zinc-700 hover:bg-zinc-800"
                    onClick={onRejectRpc}
                  >
                    Reject
                  </Button>
                  <Button
                    className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={onApproveRpc}
                  >
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing indicator */}
          {status === "processing" && (
            <Card className="border-zinc-800 bg-zinc-900/90">
              <CardContent className="flex flex-row items-center justify-center gap-3 p-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <span className="text-sm text-gray-400">Processing request...</span>
              </CardContent>
            </Card>
          )}

          {/* Idle state */}
          {!pendingRequest && status === "idle" && (
            <Card className="border-zinc-800 bg-zinc-900/90">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <p className="text-sm text-gray-500">Waiting for dApp requests...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default EVMPopup;
