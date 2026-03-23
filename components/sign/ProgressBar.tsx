import { FaRegIdBadge } from "react-icons/fa6";
import { Button } from "../ui/button";
import { useContext, useEffect, useRef, useState } from "react";
import { StoreContext } from '../../contexts'
import * as fcl from "@onflow/fcl";
import { isEnableBiometric, login } from "../../account";
import { saveKeyToList } from "./SignCard";
import Router from "next/router";

interface ProgressBarProps {
  txId: string;
  network: string;
}

type TxStatus = "pending" | "sealed" | "error" | "timeout";

const ProgressBar = ({txId, network}: ProgressBarProps) => {
  const {store, setStore} = useContext(StoreContext)
  const storeRef = useRef(store);
  const [status, setStatus] = useState<TxStatus>("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { storeRef.current = store; }, [store]);

  const url = `https://${network === 'testnet' ? 'testnet.' : ''}flowindex.io/tx/${txId}`

  const handleSealed = (result: any) => {
    const events = result.events.filter((event: any) => event.type === 'flow.AccountCreated')
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
    // Only strip secrets for passkey wallets (they use WebAuthn, no pk needed).
    // Private key / seed phrase wallets need pk for signing.
    if (isEnableBiometric() && (!userInfo.keyInfo?.type || userInfo.keyInfo.type === "Passkey")) {
      delete userInfo.keyInfo.pk
      delete userInfo.keyInfo.mnemonic
    }
    setStore(userInfo);
    login(userInfo);
    saveKeyToList(userInfo);
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
      .then((result: any) => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          handleSealed(result);
        }
      })
      .catch((err: any) => {
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
    <div className="flex flex-col space-y-3">
      <div className="flex items-center gap-3">
        {status === "pending" && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500 shrink-0" />
        )}
        <FaRegIdBadge className="text-lg shrink-0 text-zinc-400" />
        <h1 className="text-sm font-semibold text-gray-300">
          {status === "sealed" ? "Account Created!" :
           status === "error" || status === "timeout" ? "Something went wrong" :
           "Creating Flow Address"}
        </h1>
      </div>

      {status === "pending" && (
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="absolute h-full w-1/3 rounded-full bg-emerald-500 animate-[indeterminate_1.5s_ease-in-out_infinite]" />
        </div>
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
        className="text-yellow-500 hover:underline text-xs inline-flex items-center gap-1"
      >
        View in FlowIndex
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
};

export default ProgressBar;
