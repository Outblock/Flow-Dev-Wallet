import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { StoreContext } from "../../contexts";
import { useEffect, useState, useContext, useRef } from "react";
import * as fcl from "@onflow/fcl";
import { RiGlobalLine } from "react-icons/ri";
import { FaCircleCheck } from "react-icons/fa6";
import styles from "../../styles/Home.module.css";
import Head from "next/head";
import { signWithKey } from "../../utils/sign";
import { shouldAutoSign } from "../../utils/autoSign";

const Authn = () => {
  const { store } = useContext(StoreContext);
  const [authnInfo, setAuthnInfo] = useState<any>(null);
  const [status, setStatus] = useState<string>("waiting");
  const autoApproved = useRef(false);

  useEffect(() => {
    const callback = (msg: any) => {
      console.log("[authn] FCL ready response ==>", msg, store);
      setAuthnInfo(msg);
      if (store.address && store.keyInfo) {
        setStatus("ready");
      }
    };
    try {
      fcl.WalletUtils.ready(callback);
    } catch (err) {
      console.error("[authn] WalletUtils.ready error:", err);
    }
  }, [store.address]);

  // Auto-approve when auto-sign is enabled
  useEffect(() => {
    const dAppOrigin = authnInfo?.config?.client?.hostname || "localhost";
    if (authnInfo && shouldAutoSign(store, dAppOrigin) && store.address && store.keyInfo && !autoApproved.current) {
      autoApproved.current = true;
      console.log("[authn] auto-approving...");
      onApproval();
    }
  }, [authnInfo, store.autoSign, store.address]);

  const onApproval = async () => {
    const response: any = {
      f_type: "AuthnResponse",
      f_vsn: "1.0.0",
      addr: store.address,
      network: store.network,
      services: [
        {
          type: "authn",
          uid: "fdw#authn",
          f_type: "Service",
          f_vsn: "1.0.0",
          id: store.address,
          identity: { address: store.address },
          provider: {
            address: store.address,
            description: "Flow Dev Wallet",
            f_type: "ServiceProvider",
            f_vsn: "1.0.0",
            icon: `${window.location.origin}/logo.svg`,
            name: "Flow Dev Wallet",
          },
        },
        {
          endpoint: `${window.location.origin}/authz`,
          f_type: "Service",
          f_vsn: "1.0.0",
          identity: { address: store.address, keyId: store.keyInfo?.keyIndex ?? 0 },
          method: "POP/RPC",
          network: store.network,
          type: "authz",
          uid: "fdw#authz",
        },
        {
          endpoint: `${window.location.origin}/userSign`,
          f_type: "Service",
          f_vsn: "1.0.0",
          method: "POP/RPC",
          network: store.network,
          type: "user-signature",
          uid: "fdw#user-signature",
        },
      ],
    };

    // Account proof if nonce provided
    if (authnInfo?.body?.nonce && authnInfo?.body?.appIdentifier) {
      const combined = fcl.WalletUtils.encodeAccountProof({
        appIdentifier: authnInfo.body.appIdentifier,
        address: store.address,
        nonce: authnInfo.body.nonce,
      });
      const result = await signWithKey(store, combined);
      const compSig: any = {
        f_type: "CompositeSignature",
        f_vsn: "1.0.0",
        addr: store.address,
        keyId: parseInt(store.keyInfo?.keyIndex ?? 0),
        signature: result.signature,
      };
      if (result.extensionData) {
        compSig.extensions = [result.extensionData];
      }
      response.services.push({
        f_type: "Service",
        f_vsn: "1.0.0",
        type: "account-proof",
        uid: "fdw#account-proof",
        data: {
          f_type: "account-proof",
          f_vsn: "2.0.0",
          address: store.address,
          nonce: authnInfo.body.nonce,
          signatures: [compSig],
        },
      });
    }

    setStatus("approved");
    fcl.WalletUtils.approve(response);
    // Auto-close popup after approval in auto-sign mode
    if (shouldAutoSign(store)) {
      setTimeout(() => window.close(), 200);
    }
  };

  const onReject = () => {
    setStatus("rejected");
    fcl.WalletUtils.decline("Declined by user.");
  };

  // No account loaded
  if (!store.address || !store.keyInfo) {
    return (
      <div className={styles.container}>
        <Head><title>Flow Dev Wallet - Connect</title></Head>
        <main className={styles.main}>
          <Card className="w-96 border-zinc-800 bg-zinc-900/90">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <h2 className="text-xl font-bold">No Account Loaded</h2>
              <p className="text-gray-400 text-center text-sm">
                Open the wallet main page first and import a key or register with passkey.
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => window.open(window.location.origin, "_blank")}
              >
                Open Wallet
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head><title>Flow Dev Wallet - Connect</title></Head>
      <main className={styles.main}>
        <Card className="w-96 border-zinc-800 bg-zinc-900/90">
          <CardContent className="flex flex-col gap-4 p-6">
            {authnInfo && (
              <>
                <div className="flex items-center gap-4">
                  <img
                    src={authnInfo.config?.app?.icon}
                    alt=""
                    className="h-12 w-12 rounded-full bg-zinc-800"
                  />
                  <div className="flex flex-col gap-1">
                    <h1 className="text-sm font-bold text-gray-500">Connecting to</h1>
                    <h1 className="text-xl font-bold text-gray-300">
                      {authnInfo.config?.app?.title || "Unknown App"}
                    </h1>
                  </div>
                </div>

                <Card className="border-zinc-800 bg-zinc-800/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <RiGlobalLine className="text-lg text-blue-100" />
                      <span className="text-sm text-blue-100">
                        {authnInfo.config?.client?.hostname || "localhost"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-800/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500 uppercase mb-2">This App would like to</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <FaCircleCheck className="text-emerald-500" />
                        <p className="text-sm">View your wallet balance and activity</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaCircleCheck className="text-emerald-500" />
                        <p className="text-sm">Request approval for transactions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500">Account:</span>
                  <span className="text-sm font-mono text-gray-300">{store.address}</span>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 border-zinc-700 hover:bg-zinc-800"
                    onClick={onReject}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={onApproval}
                  >
                    Connect
                  </Button>
                </div>
              </>
            )}

            {!authnInfo && (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-gray-400 text-sm">Waiting for dApp connection...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Authn;
