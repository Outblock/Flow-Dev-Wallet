import { FaRegIdBadge } from "react-icons/fa6";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { useContext, useEffect, useRef, useState } from "react";
import { StoreContext } from '../../contexts'
import * as fcl from "@onflow/fcl";
import { isEnableBiometric, login } from "../../account";
import Router from "next/router";

const ProgressBar = ({txId, network}) => {
  const {store, setStore} = useContext(StoreContext)
  const storeRef = useRef(store);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState(null);

  useEffect(() => { storeRef.current = store; }, [store]);

  const url = `https://${network === 'testnet' ? 'testnet.' : ''}flowindex.io/tx/${txId}`

  const handleSealed = (result) => {
    const events = result.events.filter(event => event.type === 'flow.AccountCreated')
    if (events.length == 0) {
      setStatus("error");
      setError("No AccountCreated event found in transaction");
      return;
    }
    const address = events[0].data.address
    const userInfo = { ...storeRef.current }
    userInfo.address = address
    delete userInfo.isCreating
    delete userInfo.txId
    if (isEnableBiometric()) {
      delete userInfo.keyInfo.pk
      delete userInfo.keyInfo.mnemonic
    }
    setStore(userInfo);
    login(userInfo);
    setStatus("sealed");
  };

  const resetAndGoHome = () => {
    const cleaned = { ...storeRef.current };
    delete cleaned.isCreating;
    delete cleaned.txId;
    delete cleaned.keyInfo;
    delete cleaned.address;
    setStore(cleaned);
    login(cleaned);
    Router.push("/");
  };

  useEffect(() => {
    if (!txId) return;
    console.log('txId ===>', txId);

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setStatus("timeout");
        setError("Transaction polling timed out. Check the explorer link.");
      }
    }, 120000);

    fcl.tx(txId).onceSealed()
      .then((result) => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          handleSealed(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          console.error("tx error:", err);
          setStatus("error");
          setError(err.message || "Failed to poll transaction");
        }
      });

    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [txId]);

  return (
    <Card className="w-full border-zinc-800 bg-zinc-900/90">
      <CardContent className="flex flex-col space-y-4 p-6">
        <div className="flex items-center gap-4">
          <FaRegIdBadge className="text-2xl" />
          <h1 className="text-2xl font-bold text-gray-300">
            {status === "sealed" ? "Account Created!" :
             status === "error" || status === "timeout" ? "Something went wrong" :
             "Creating Flow Address"}
          </h1>
        </div>

        {status === "pending" && (
          <Progress
            value={100}
            className="max-w [&>div]:animate-pulse [&>div]:bg-emerald-500"
          />
        )}

        {(status === "error" || status === "timeout") && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={resetAndGoHome}>
              Start Over
            </Button>
          </div>
        )}

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-500 hover:underline text-sm inline-flex items-center gap-1"
        >
          View in FlowIndex
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </CardContent>
    </Card>
  );
};

export default ProgressBar;
