import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { StoreContext } from "../../contexts";
import {
  createPasskey,
  getPasskey,
  getPKfromLogin,
  getPKfromRegister,
} from "../../utils/passkey";
import { useEffect, useState, useContext } from "react";
import { getUsername } from "../../modules/settings";
import {
  IoFingerPrintOutline,
  IoKeyOutline,
  IoSettingsOutline,
  IoAddCircleOutline,
  IoDownloadOutline,
  IoArrowBackOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { FaListOl } from "react-icons/fa6";
import { LuWallet } from "react-icons/lu";
import Router from "next/router";
import { login } from "../../account";
import toast from "react-hot-toast";
import { generatePrivateKey, generateMnemonic } from "../../utils/keyManager";
import { createFlowAccount } from "../../utils/accountManager";
import { motion, AnimatePresence } from "motion/react";
import { KEY_TYPE } from "../../utils/constants";
import { encrypt, decrypt } from "../../utils/crypto";
import React from "react";

const SAVED_KEYS_KEY = "saved_keys";

interface SavedKeyEntry {
  address: string;
  network?: string;
  keyType?: string;
  evmAddress?: string;
  encrypted?: string;
  storeData?: any;
  savedAt?: number;
}

function getSavedKeysRaw(): SavedKeyEntry[] {
  try {
    return JSON.parse(window.localStorage.getItem(SAVED_KEYS_KEY) || "[]");
  } catch { return []; }
}

async function getSavedKeys(): Promise<SavedKeyEntry[]> {
  const entries = getSavedKeysRaw();
  const results: SavedKeyEntry[] = [];
  for (const entry of entries) {
    try {
      if (entry.encrypted) {
        const plain = await decrypt(entry.encrypted);
        results.push({ ...entry, storeData: JSON.parse(plain) });
      } else if (entry.storeData) {
        // Legacy unencrypted — migrate on next save
        results.push(entry);
      }
    } catch {
      // Skip corrupted entries
    }
  }
  return results;
}

async function saveKeyToList(storeData: any): Promise<void> {
  if (!storeData?.address) return;
  const entries = getSavedKeysRaw();
  const idx = entries.findIndex(k => k.address === storeData.address);
  const encrypted = await encrypt(JSON.stringify(storeData));
  const entry: SavedKeyEntry = {
    address: storeData.address,
    network: storeData.network,
    keyType: storeData.keyInfo?.type || "Unknown",
    evmAddress: storeData.keyInfo?.evmAddress,
    encrypted,
    savedAt: Date.now(),
  };
  if (idx >= 0) entries[idx] = entry; else entries.unshift(entry);
  window.localStorage.setItem(SAVED_KEYS_KEY, JSON.stringify(entries));
}

function removeKeyFromList(address: string): void {
  const keys = getSavedKeysRaw().filter(k => k.address !== address);
  window.localStorage.setItem(SAVED_KEYS_KEY, JSON.stringify(keys));
}

type Mode = null | 'create' | 'passkey-signin';
type CreateType = null | 'passkey' | 'privateKey';

const SignCard = () => {
  const { store, setStore } = useContext(StoreContext);
  const [mode, setMode] = useState<Mode>(null);
  const [username, setUsername] = useState("");
  const [createType, setCreateType] = useState<CreateType>(null);
  const [generatedKey, setGeneratedKey] = useState<{ pk: string; pubK: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerInfo, setRegisterInfo] = useState<any>(null);
  const [loginInfo, setLoginInfo] = useState<any>(null);
  const [savedKeys, setSavedKeys] = useState<SavedKeyEntry[]>([]);

  // Load saved keys on mount
  useEffect(() => {
    getSavedKeys().then(setSavedKeys);
  }, []);

  // Handle passkey login
  useEffect(() => {
    if (!loginInfo) return;
    const result = getPKfromLogin(loginInfo);
    const storedUser = JSON.parse(window.localStorage.getItem("store") || "null");
    if (storedUser && storedUser.address) {
      const user = { ...store, address: storedUser.address, id: loginInfo.credentialId, username: storedUser.username || getUsername(loginInfo.credentialId), keyInfo: { ...result, pubK: storedUser.keyInfo?.pubK } };
      setStore(user);
      login(user);
      saveKeyToList(user);
    } else {
      toast.error("No stored account found. Please register first.");
    }
  }, [loginInfo]);

  // Handle passkey register
  useEffect(() => {
    if (!registerInfo || !registerInfo.credentialId) return;
    const result = getPKfromRegister(registerInfo);

    // Derive smart wallet address for passkey (async)
    (async () => {
      try {
        const { getSmartWalletAddress } = await import("../../utils/smartWallet");
        const smartWalletAddress = await getSmartWalletAddress(
          registerInfo.publicKeySec1Hex,
          store.network || "testnet"
        );
        result.smartWalletAddress = smartWalletAddress;
      } catch (e) {
        console.warn("[passkey] Could not derive smart wallet address:", e);
      }
      setStore((s: any) => ({ ...s, keyInfo: result, id: registerInfo.credentialId, username, isCreating: true }));
      doCreateAccount(result.pubK);
    })();
  }, [registerInfo]);

  const doCreateAccount = async (pubK: string, signatureAlgorithm = "ECDSA_P256", hashAlgorithm = "SHA2_256") => {
    try {
      const txId = await createFlowAccount(pubK, store.network, signatureAlgorithm, hashAlgorithm);
      if (txId) setStore((s: any) => ({ ...s, txId }));
    } catch (e: any) {
      toast.error(e.message);
      setStore((s: any) => ({ ...s, isCreating: false }));
    }
  };

  // Read algorithm preference from settings (default: secp256k1 + SHA2_256)
  const prefSigAlgo = store.sigAlgo || "ECDSA_secp256k1";
  const prefHashAlgo = store.hashAlgo || "SHA2_256";

  const handleCreateWithKey = async () => {
    setLoading(true);
    try {
      const keyInfo = await generatePrivateKey(prefSigAlgo);
      keyInfo.hashAlgo = prefHashAlgo;
      setGeneratedKey({ pk: keyInfo.pk, pubK: keyInfo.pubK });
      const user = { ...store, keyInfo, isCreating: true };
      setStore(user);
      login(user);
      await doCreateAccount(keyInfo.pubK, prefSigAlgo, prefHashAlgo);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  // Header
  const Header = ({ subtitle }: { subtitle?: string }) => (
    <Card className="w-full border-zinc-800">
      <CardContent className="flex flex-row items-center gap-4 p-4">
        <img width={40} src="./logo.svg" alt="logo" />
        <div className="flex flex-col grow">
          <h1 className="text-xl font-bold text-gray-200">Flow Dev Wallet</h1>
          <p className="text-xs text-gray-500">{subtitle || "Welcome"}</p>
        </div>
        <div className="flex items-center gap-2">
          {store.network && (
            <Badge variant="secondary" className={`uppercase text-[10px] font-mono ${store.network === "mainnet" ? "bg-emerald-900/50 text-emerald-400 border-emerald-800" : store.network === "emulator" ? "bg-violet-900/50 text-violet-400 border-violet-800" : "bg-green-900/50 text-green-400 border-green-800"}`}>
              {store.network}
            </Badge>
          )}
          {store.autoSign && <Badge variant="secondary" className="text-[10px] bg-amber-900/50 text-amber-400 border-amber-800">auto</Badge>}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => Router.push("/settings")}>
            <IoSettingsOutline className="text-lg text-gray-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const BackButton = ({ onClick }: { onClick?: () => void }) => (
    <Button size="sm" variant="ghost" onClick={onClick || (() => { setMode(null); setCreateType(null); })} className="self-start -ml-1 text-gray-500">
      <IoArrowBackOutline className="mr-1" />
      Back
    </Button>
  );

  const handleCreateWithSeed = async () => {
    setLoading(true);
    try {
      const keyInfo = await generateMnemonic(prefSigAlgo);
      keyInfo.hashAlgo = prefHashAlgo;
      const user = { ...store, keyInfo, isCreating: true };
      setStore(user);
      login(user);
      toast.success("Seed phrase generated! Save it securely.");
      await doCreateAccount(keyInfo.pubK, prefSigAlgo, prefHashAlgo);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const modeKey = !mode ? "home" : mode === "create" && !createType ? "create" : mode === "create" && createType === "passkey" ? "passkey" : "home";

  const MotionWrap = ({ children }: { children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-3 w-full"
    >
      {children}
    </motion.div>
  );

  // === Main selector ===
  if (!mode) {
    return (
      <AnimatePresence mode="wait">
      <MotionWrap key="home">
        <Header subtitle="Get started" />
        <Card className="w-full border-zinc-800">
          <CardContent className="flex flex-col gap-2 p-3">
            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-4 px-4 justify-start"
              variant="ghost"
              onClick={() => setMode("create")}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 flex justify-center shrink-0">
                  <IoAddCircleOutline className="text-xl text-blue-400" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm text-gray-200">Create Wallet</span>
                  <span className="text-[11px] text-gray-500">Generate a new wallet with passkey or private key</span>
                </div>
              </div>
            </Button>

            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-4 px-4 justify-start"
              variant="ghost"
              onClick={() => Router.push("/import")}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 flex justify-center shrink-0">
                  <IoDownloadOutline className="text-xl text-green-400" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm text-gray-200">Import Wallet</span>
                  <span className="text-[11px] text-gray-500">Seed phrase, private key, or JSON keystore</span>
                </div>
              </div>
            </Button>

            <Separator className="my-1" />

            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-3 px-4 justify-start"
              variant="ghost"
              onClick={async () => {
                try {
                  const result = await getPasskey(store.id || "");
                  setLoginInfo(result);
                } catch (e) {
                  toast.error("Passkey sign-in failed");
                }
              }}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 flex justify-center shrink-0">
                  <IoFingerPrintOutline className="text-xl text-purple-400" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm text-gray-200">Sign In with Passkey</span>
                  <span className="text-[11px] text-gray-500">Already registered? Sign in with biometric</span>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Saved local keys */}
        {savedKeys.length > 0 && (
          <Card className="w-full border-zinc-800">
            <CardContent className="flex flex-col gap-1 p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider px-2 py-1">Saved Accounts</p>
              {savedKeys.map((entry) => (
                <div key={entry.address} className="flex items-center gap-2 group">
                  <Button
                    className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-3 px-3 justify-start flex-1 min-w-0"
                    variant="ghost"
                    onClick={() => {
                      const data = entry.storeData;
                      setStore(data);
                      login(data);
                      toast.success("Signed in!");
                    }}
                  >
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <div className="w-7 flex justify-center shrink-0">
                        <LuWallet className="text-base text-zinc-400" />
                      </div>
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-300 truncate">
                            {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                          </span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-800 text-zinc-400 border-zinc-700">
                            {entry.keyType}
                          </Badge>
                          {entry.network && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-800 text-zinc-500 border-zinc-700">
                              {entry.network}
                            </Badge>
                          )}
                        </div>
                        {entry.evmAddress && (
                          <span className="font-mono text-[10px] text-zinc-600 truncate">
                            EVM: {entry.evmAddress.slice(0, 6)}...{entry.evmAddress.slice(-4)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Button>
                  <button
                    className="p-2 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={async (e: React.MouseEvent) => {
                      e.stopPropagation();
                      removeKeyFromList(entry.address);
                      setSavedKeys(await getSavedKeys());
                      toast.success("Removed");
                    }}
                  >
                    <IoTrashOutline className="text-sm" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </MotionWrap>
      </AnimatePresence>
    );
  }

  // === Create wallet: choose type ===
  if (mode === "create" && !createType) {
    return (
      <AnimatePresence mode="wait">
      <MotionWrap key="create">
        <Header subtitle="Create new wallet" />
        <Card className="w-full border-zinc-800">
          <CardContent className="flex flex-col gap-2 p-3">
            <BackButton />

            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-4 px-4 justify-start"
              variant="ghost"
              onClick={() => setCreateType("passkey")}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 flex justify-center shrink-0">
                  <IoFingerPrintOutline className="text-xl text-blue-400" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm text-gray-200">Passkey</span>
                  <span className="text-[11px] text-gray-500">Create with WebAuthn / biometric (FLIP-264)</span>
                </div>
              </div>
            </Button>

            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-4 px-4 justify-start"
              variant="ghost"
              onClick={handleCreateWithSeed}
              disabled={loading}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 flex justify-center shrink-0">
                  <FaListOl className="text-lg text-green-400" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm text-gray-200">{loading ? "Creating..." : "Seed Phrase"}</span>
                  <span className="text-[11px] text-gray-500">Generate BIP-39 mnemonic and create account</span>
                </div>
              </div>
            </Button>

            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-4 px-4 justify-start"
              variant="ghost"
              onClick={handleCreateWithKey}
              disabled={loading}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 flex justify-center shrink-0">
                  <IoKeyOutline className="text-xl text-orange-400" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm text-gray-200">{loading ? "Creating..." : "Private Key"}</span>
                  <span className="text-[11px] text-gray-500">Auto-generate a P256 key pair and create account</span>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </MotionWrap>
      </AnimatePresence>
    );
  }

  // === Create with passkey ===
  if (mode === "create" && createType === "passkey") {
    return (
      <AnimatePresence mode="wait">
      <MotionWrap key="passkey">
        <Header subtitle="Create with Passkey" />
        <Card className="w-full border-zinc-800">
          <CardContent className="flex flex-col gap-4 p-5">
            <BackButton onClick={() => setCreateType(null)} />
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Username</label>
              <Input
                type="text"
                placeholder="Choose a name for your passkey"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                className="bg-zinc-900/50 border-zinc-700"
              />
            </div>
            <Button
              className="bg-[#00EF8B] text-black hover:bg-[#00d67d] font-semibold"
              disabled={!username.trim()}
              onClick={async () => {
                try {
                  setRegisterInfo(await createPasskey(username));
                } catch (e) {
                  toast.error("Passkey registration failed");
                }
              }}
            >
              Register with Passkey
            </Button>
          </CardContent>
        </Card>
      </MotionWrap>
      </AnimatePresence>
    );
  }

  return null;
};

export default SignCard;
export { saveKeyToList, getSavedKeys, removeKeyFromList };
