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
} from "react-icons/io5";
import { FaListOl } from "react-icons/fa6";
import Router from "next/router";
import { login } from "../../account";
import toast from "react-hot-toast";
import { KEY_TYPE, SIGN_ALGO, HASH_ALGO } from "../../utils/constants";
import { pk2PubKey } from "../../utils/findAddressWithPK";
import { deriveEvmAddress, deriveEvmAddressFromMnemonic } from "../../utils/evm";

const SignCard = () => {
  const { store, setStore } = useContext(StoreContext);
  const [mode, setMode] = useState(null); // null | 'create' | 'passkey-signin'
  const [username, setUsername] = useState("");
  const [createType, setCreateType] = useState(null); // 'passkey' | 'privateKey'
  const [generatedKey, setGeneratedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registerInfo, setRegisterInfo] = useState(null);
  const [loginInfo, setLoginInfo] = useState(null);

  // Handle passkey login
  useEffect(() => {
    if (!loginInfo) return;
    const result = getPKfromLogin(loginInfo);
    const storedUser = JSON.parse(window.localStorage.getItem("store") || "null");
    if (storedUser && storedUser.address) {
      const user = { ...store, address: storedUser.address, id: loginInfo.credentialId, username: storedUser.username || getUsername(loginInfo.credentialId), keyInfo: { ...result, pubK: storedUser.keyInfo?.pubK } };
      setStore(user);
      login(user);
    } else {
      toast.error("No stored account found. Please register first.");
    }
  }, [loginInfo]);

  // Handle passkey register
  useEffect(() => {
    if (!registerInfo || !registerInfo.credentialId) return;
    const result = getPKfromRegister(registerInfo);
    setStore((s) => ({ ...s, keyInfo: result, id: registerInfo.credentialId, username, isCreating: true }));
    createAccount(result.pubK);
  }, [registerInfo]);

  const createAccount = async (pubK) => {
    try {
      const resp = await fetch("/api/createAddress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: pubK, network: store.network }),
      });
      const body = await resp.json();
      if (body.error) {
        toast.error(body.error);
        setStore((s) => ({ ...s, isCreating: false }));
        return;
      }
      if (body.txId) setStore((s) => ({ ...s, txId: body.txId }));
    } catch (e) {
      toast.error(e.message);
      setStore((s) => ({ ...s, isCreating: false }));
    }
  };

  const handleCreateWithKey = async () => {
    setLoading(true);
    try {
      const pk = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, "0")).join("");
      const keys = pk2PubKey(pk);
      const evmAddress = await deriveEvmAddress(pk);
      setGeneratedKey({ pk, pubK: keys.P256.pubK });
      const user = {
        ...store,
        keyInfo: { type: KEY_TYPE.PRIVATE_KEY, pk, pubK: keys.P256.pubK, keyIndex: 0, signAlgo: SIGN_ALGO.P256, hashAlgo: HASH_ALGO.SHA256, evmAddress },
        isCreating: true,
      };
      setStore(user);
      login(user);
      await createAccount(keys.P256.pubK);
    } catch (e) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  // Header
  const Header = ({ subtitle }) => (
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

  const BackButton = ({ onClick }) => (
    <Button size="sm" variant="ghost" onClick={onClick || (() => { setMode(null); setCreateType(null); })} className="self-start -ml-1 text-gray-500">
      <IoArrowBackOutline className="mr-1" />
      Back
    </Button>
  );

  // === Main selector ===
  if (!mode) {
    return (
      <div className="flex flex-col gap-3 w-full">
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
      </div>
    );
  }

  const handleCreateWithSeed = async () => {
    setLoading(true);
    try {
      const { mnemonicToSeedSync, generateMnemonic } = await import("@scure/bip39");
      const { wordlist } = await import("@scure/bip39/wordlists/english.js");
      const { HDKey } = await import("@scure/bip32");
      const { secp256k1 } = await import("@noble/curves/secp256k1.js");
      const { FLOW_BIP44_PATH } = await import("../../utils/constants");

      const mnemonic = generateMnemonic(wordlist);
      const seed = mnemonicToSeedSync(mnemonic);
      const hdKey = HDKey.fromMasterSeed(seed);
      const child = hdKey.derive(FLOW_BIP44_PATH);
      const pk = Array.from(child.privateKey).map(b => b.toString(16).padStart(2, "0")).join("");
      const pubKeyBytes = secp256k1.getPublicKey(child.privateKey, false);
      const pubK = Array.from(pubKeyBytes).map(b => b.toString(16).padStart(2, "0")).join("").slice(2);
      const evmAddress = await deriveEvmAddressFromMnemonic(mnemonic);

      const user = {
        ...store,
        keyInfo: { type: KEY_TYPE.SEED_PHRASE, pk, pubK, keyIndex: 0, signAlgo: SIGN_ALGO.SECP256K1, hashAlgo: HASH_ALGO.SHA256, mnemonic, evmAddress },
        isCreating: true,
      };
      setStore(user);
      login(user);
      toast.success("Seed phrase generated! Save it securely.");
      await createAccount(pubK);
    } catch (e) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  // === Create wallet: choose type ===
  if (mode === "create" && !createType) {
    return (
      <div className="flex flex-col gap-3 w-full">
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
      </div>
    );
  }

  // === Create with passkey ===
  if (mode === "create" && createType === "passkey") {
    return (
      <div className="flex flex-col gap-3 w-full">
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
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-900/50 border-zinc-700"
              />
            </div>
            <Button
              className="bg-[#00EF8B] text-black hover:bg-[#00d67d] font-semibold"
              disabled={!username.trim()}
              onClick={async () => {
                try {
                  setRegisterInfo(await createPasskey(username, username));
                } catch (e) {
                  toast.error("Passkey registration failed");
                }
              }}
            >
              Register with Passkey
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default SignCard;
