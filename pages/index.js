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
      <div className="flex flex-col gap-3 w-full">
        {/* Show EVM address immediately */}
        {evmAddress && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">EVM</Badge>
                  <code className="font-mono text-xs text-gray-300 truncate">{evmAddress}</code>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(evmAddress); }}
                  className="text-gray-500 hover:text-gray-300 text-xs"
                >
                  Copy
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flow address: loading or progress */}
        {hasTxId ? (
          <ProgressBar txId={store.txId} network={store.network} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-[#00EF8B]" />
                <p className="text-sm text-gray-400">Creating Flow account...</p>
              </div>
              <p className="text-xs text-gray-600">This may take a few seconds</p>
            </CardContent>
          </Card>
        )}

        {/* Reset button — only show after 10s of no txId */}
        <ResetButton store={store} resetCreating={resetCreating} />
      </div>
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
