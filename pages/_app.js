import { useEffect, useState } from "react";
import "../styles/globals.css";
import { NextUIProvider } from "@nextui-org/react";
import { StoreContext } from "../contexts";
import fclConfig, { getDefaultRpc } from "../utils/config";
import { load } from "../account";
import toast, { Toaster } from 'react-hot-toast';

function loadSettingsConfig(defaultNetwork) {
  if (typeof window === 'undefined') return { network: defaultNetwork, rpcUrl: getDefaultRpc(defaultNetwork), autoSign: false };
  try {
    const saved = JSON.parse(localStorage.getItem("settings_config") || "{}");
    return {
      network: saved.network || defaultNetwork,
      rpcUrl: saved.rpcUrl || getDefaultRpc(saved.network || defaultNetwork),
      autoSign: saved.autoSign || false,
    };
  } catch {
    return { network: defaultNetwork, rpcUrl: getDefaultRpc(defaultNetwork), autoSign: false };
  }
}

function MyApp({ Component, pageProps }) {
  const defaultNetwork = process.env.network || "testnet";
  // Load settings synchronously on first render to avoid double fclConfig call
  const [settings] = useState(() => loadSettingsConfig(defaultNetwork));
  const [store, setStore] = useState({ network: settings.network, rpcUrl: settings.rpcUrl, autoSign: settings.autoSign });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fclConfig(settings.network, settings.rpcUrl);

    const cache = load();
    console.log("cache ==>", cache);
    if (cache) {
      // Clear stuck isCreating state if no txId
      if (cache.isCreating && !cache.txId) {
        delete cache.isCreating;
      }
      setStore({ ...cache, network: settings.network, rpcUrl: settings.rpcUrl, autoSign: settings.autoSign });
    }
    setReady(true);
  }, []);

  return (
    <NextUIProvider>
      <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#282828',
          color: '#fff',
        },
      }}/>
      <StoreContext.Provider value={{ store, setStore }}>
        <main className="dark text-foreground bg-background">
          <Component {...pageProps} />
        </main>
      </StoreContext.Provider>
    </NextUIProvider>
  );
}

export default MyApp;
