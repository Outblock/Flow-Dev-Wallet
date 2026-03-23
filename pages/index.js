import Head from "next/head";
import styles from "../styles/Home.module.css";
import { useEffect, useState, useContext } from "react";
import ProgressBar from "../components/sign/ProgressBar";
import SignCard from "../components/sign/SignCard";
import WalletCard from "../components/WalletCard";
import Connect from "../components/Connect";
import { StoreContext } from '../contexts'
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import ErrorCard from "../components/error";
import { login } from "../account";

export default function Home() {
  const { store, setStore } = useContext(StoreContext)
  const [isLoading, setLoading ] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  const resetCreating = () => {
    const cleaned = { ...store };
    delete cleaned.isCreating;
    delete cleaned.txId;
    delete cleaned.keyInfo;
    setStore(cleaned);
    login(cleaned);
  }

  // Creating state UI — shows EVM address immediately, Flow address loading
  const renderCreating = () => {
    const evmAddress = store.keyInfo?.evmAddress;
    const hasTxId = !!store.txId;

    return (
      <Card className="w-full border-zinc-800/60 bg-zinc-900/80 overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-5">
          {/* Show EVM address immediately */}
          {evmAddress && (
            <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2.5">
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] shrink-0">EVM</Badge>
              <code className="font-mono text-[11px] text-zinc-400 truncate flex-1">{evmAddress}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(evmAddress); }}
                className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}

          {/* Flow address: loading or progress */}
          {hasTxId ? (
            <ProgressBar txId={store.txId} network={store.network} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
                <p className="text-sm text-gray-400">Creating Flow account...</p>
              </div>
              <p className="text-xs text-gray-600">This may take a few seconds</p>
            </div>
          )}

          {/* Reset button — only show after delay */}
          <ResetButton store={store} resetCreating={resetCreating} />
        </CardContent>
      </Card>
    );
  }

  const render = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#00EF8B]" />
        </div>
      )
    }

    if (store.isCreating) {
      return renderCreating()
    }

    if (!store.keyInfo) {
      return <SignCard />
    }

    if (store.address && store.keyInfo) {
      return <WalletCard address={store.address} />
    }

    return <ErrorCard/>
  }

  return (
    <div className={styles.container}>
        <Head>
          <title>Flow Dev Wallet</title>
        </Head>
      <main className={styles.main}>
        <div className="w-full max-w-[420px] min-w-[360px] h-dvh py-5 flex flex-col gap-4 items-center justify-center px-4">
          <Connect/>
          {render()}
        </div>
      </main>
    </div>
  );
}

// Show "Start Over" only after a delay, so it doesn't flash
function ResetButton({ store, resetCreating }) {
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowReset(true), 15000); // 15s delay
    return () => clearTimeout(timer);
  }, []);

  // Always show if txId failed (stuck for a while)
  if (!showReset && store.txId) return null;
  if (!showReset) return null;

  return (
    <Button variant="ghost" size="sm" onClick={resetCreating} className="text-gray-500 text-xs self-center">
      Start Over
    </Button>
  );
}
