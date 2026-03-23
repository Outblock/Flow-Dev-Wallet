import Head from "next/head";
import styles from "../styles/Home.module.css";
import { useEffect, useState, useContext } from "react";
import ProgressBar from "../components/sign/ProgressBar";
import SignCard from "../components/sign/SignCard";
import WalletCard from "../components/WalletCard";
import Connect from "../components/Connect";
import { StoreContext } from '../contexts'
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

  const render = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#00EF8B]" />
        </div>
      )
    }

    // Show creating progress only if we have a valid txId
    if (store.isCreating && store.txId) {
      return <ProgressBar txId={store.txId} network={store.network}/>
    }

    // Stuck in creating without txId — let user reset
    if (store.isCreating && !store.txId) {
      return (
        <div className="flex flex-col gap-3 w-full items-center">
          <p className="text-gray-500 text-sm">Account creation incomplete.</p>
          <Button className="bg-[#00EF8B] text-black hover:bg-[#00d67d] font-semibold" onClick={resetCreating}>
            Start Over
          </Button>
        </div>
      )
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
