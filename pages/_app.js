import { useEffect, useState } from "react";
import "../styles/globals.css";
import { StoreContext } from "../contexts";
import fclConfig, { getDefaultRpc } from "../utils/config";
import { load, login } from "../account";
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

/**
 * Apply URL parameters to pre-configure the wallet.
 * Supports: ?seed=<privateKeyHex>&network=testnet|mainnet|emulator&autoSign=true
 */
async function applyUrlParams(store, setStore) {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  const network = params.get('network');
  const autoSign = params.get('autoSign');

  if (!seed && !network && autoSign == null) return false;

  let updated = { ...store };

  // Apply network
  if (network && ['mainnet', 'testnet', 'emulator'].includes(network)) {
    updated.network = network;
    updated.rpcUrl = getDefaultRpc(network);
  }

  // Apply autoSign
  if (autoSign != null) {
    updated.autoSign = autoSign === 'true';
  }

  // Apply seed (private key) — derive pubKey, evmAddress, set up keyInfo
  if (seed) {
    try {
      const { pk2PubKey } = await import("../utils/findAddressWithPK");
      const { deriveEvmAddress } = await import("../utils/evm");
      const { KEY_TYPE, SIGN_ALGO, HASH_ALGO } = await import("../utils/constants");

      const keys = pk2PubKey(seed);
      const evmAddress = await deriveEvmAddress(seed);
      updated.keyInfo = {
        type: KEY_TYPE.PRIVATE_KEY,
        pk: seed,
        pubK: keys.P256.pubK,
        keyIndex: 0,
        signAlgo: SIGN_ALGO.P256,
        hashAlgo: HASH_ALGO.SHA256,
        evmAddress,
      };

      // Try to find associated on-chain address
      try {
        const { findAddressWithPK } = await import("../utils/findAddressWithPK");
        const accounts = await findAddressWithPK(seed);
        if (accounts && accounts.length > 0) {
          const acct = accounts[0];
          updated.address = acct.address;
          updated.keyInfo = {
            ...updated.keyInfo,
            pubK: acct.pubK,
            keyIndex: acct.keyIndex,
            signAlgo: acct.signAlgo,
            hashAlgo: acct.hashAlgo,
            evmAddress: acct.evmAddress || evmAddress,
          };
        }
      } catch (e) {
        console.warn("[url-params] Could not look up address on chain:", e.message);
      }
    } catch (e) {
      console.error("[url-params] Failed to derive key from seed:", e);
      return false;
    }
  }

  // Save to localStorage
  login(updated);
  localStorage.setItem("settings_config", JSON.stringify({
    network: updated.network,
    rpcUrl: updated.rpcUrl,
    autoSign: updated.autoSign,
  }));

  setStore(updated);
  console.log("[url-params] Wallet configured from URL params:", updated);
  return true;
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

    // Apply URL params (async, runs after initial load)
    const initialStore = cache
      ? { ...cache, network: settings.network, rpcUrl: settings.rpcUrl, autoSign: settings.autoSign }
      : { network: settings.network, rpcUrl: settings.rpcUrl, autoSign: settings.autoSign };
    applyUrlParams(initialStore, setStore);

    setReady(true);
  }, []);

  return (
    <>
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
    </>
  );
}

export default MyApp;
