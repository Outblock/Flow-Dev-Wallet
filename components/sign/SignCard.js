import {
  Button,
  Card,
  CardBody,
  Divider,
  Input,
  Chip,
  Image,
} from "@nextui-org/react";
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
    <Card className="w-full">
      <CardBody className="flex flex-row items-center gap-4 p-4">
        <Image width={40} src="./logo.svg" alt="logo" />
        <div className="flex flex-col grow">
          <h1 className="text-xl font-bold text-gray-200">Flow Dev Wallet</h1>
          <p className="text-xs text-gray-500">{subtitle || "Welcome"}</p>
        </div>
        <div className="flex items-center gap-2">
          {store.network && (
            <Chip size="sm" variant="flat" color={store.network === "mainnet" ? "primary" : store.network === "emulator" ? "secondary" : "success"} className="uppercase text-[10px]">
              {store.network}
            </Chip>
          )}
          {store.autoSign && <Chip size="sm" variant="flat" color="warning" className="text-[10px]">auto</Chip>}
          <Button isIconOnly variant="light" size="sm" onPress={() => Router.push("/settings")}>
            <IoSettingsOutline className="text-lg text-gray-500" />
          </Button>
        </div>
      </CardBody>
    </Card>
  );

  const BackButton = ({ onPress }) => (
    <Button size="sm" variant="light" onPress={onPress || (() => { setMode(null); setCreateType(null); })} className="self-start -ml-1 text-gray-500" startContent={<IoArrowBackOutline />}>
      Back
    </Button>
  );

  // === Main selector ===
  if (!mode) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <Header subtitle="Get started" />
        <Card className="w-full">
          <CardBody className="flex flex-col gap-2 p-3">
            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-4 px-4 justify-start"
              variant="light"
              onPress={() => setMode("create")}
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
              variant="light"
              onPress={() => Router.push("/import")}
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

            <Divider className="my-1" />

            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-3 px-4 justify-start"
              variant="light"
              onPress={async () => {
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
          </CardBody>
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
        <Card className="w-full">
          <CardBody className="flex flex-col gap-2 p-3">
            <BackButton />

            <Button
              className="bg-zinc-900/50 hover:bg-zinc-800 h-auto py-4 px-4 justify-start"
              variant="light"
              onPress={() => setCreateType("passkey")}
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
              variant="light"
              onPress={handleCreateWithSeed}
              isDisabled={loading}
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
              variant="light"
              onPress={handleCreateWithKey}
              isDisabled={loading}
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
          </CardBody>
        </Card>
      </div>
    );
  }

  // === Create with passkey ===
  if (mode === "create" && createType === "passkey") {
    return (
      <div className="flex flex-col gap-3 w-full">
        <Header subtitle="Create with Passkey" />
        <Card className="w-full">
          <CardBody className="flex flex-col gap-4 p-5">
            <BackButton onPress={() => setCreateType(null)} />
            <Input
              isClearable
              type="text"
              label="Username"
              value={username}
              description="Choose a name for your passkey"
              onValueChange={setUsername}
            />
            <Button
              color="primary"
              variant="solid"
              isDisabled={!username.trim()}
              onPress={async () => {
                try {
                  setRegisterInfo(await createPasskey(username, username));
                } catch (e) {
                  toast.error("Passkey registration failed");
                }
              }}
            >
              Register with Passkey
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return null;
};

export default SignCard;
