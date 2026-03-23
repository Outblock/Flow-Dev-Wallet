import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import { StoreContext } from "../../contexts";
import { useEffect, useState, useContext, useRef } from "react";
import * as fcl from "@onflow/fcl";
import { RiGlobalLine } from "react-icons/ri";
import styles from "../../styles/Home.module.css";
import Head from "next/head";
import { signUserMsg } from "../../utils/sign";

const UserSign = () => {
  const { store } = useContext(StoreContext);
  const [authzInfo, setAuthzInfo] = useState(null);
  const autoSigned = useRef(false);

  useEffect(() => {
    const callback = (msg) => {
      console.log("[userSign] msg ==>", msg);
      setAuthzInfo(msg);
    };
    try {
      fcl.WalletUtils.ready(callback);
    } catch (err) {}
  }, []);

  // Auto-sign when enabled
  useEffect(() => {
    if (authzInfo && store.autoSign && !autoSigned.current) {
      autoSigned.current = true;
      console.log("[userSign] auto-signing...");
      onApproval();
    }
  }, [authzInfo, store.autoSign]);

  const onApproval = async () => {
    const result = await signUserMsg(store, authzInfo.body.message);
    const response = {
      f_type: "CompositeSignature",
      f_vsn: "1.0.0",
      addr: store.address,
      keyId: parseInt(store.keyInfo?.keyIndex ?? 0),
      network: store.network,
      signature: result.signature,
    };
    if (result.extensionData) {
      response.extensions = [result.extensionData];
    }
    fcl.WalletUtils.approve(response);
    // Auto-close popup after approval in auto-sign mode
    if (store.autoSign) {
      setTimeout(() => window.close(), 200);
    }
  };

  const onReject = () => {
    fcl.WalletUtils.decline("Declined by user.");
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Flow Dev Wallet - Sign Message</title>
      </Head>

      <main className={styles.main}>
      <div className="w-2/3 min-w-[calc(max(80%,400px))] max-w-[calc(min(80%,400px))] sm:w-full flex flex-col gap-4">
          <Card className="border-zinc-800 bg-zinc-900/90">
            {authzInfo && (
              <CardContent className="flex flex-col space-y-4 p-6">
                {store.autoSign && (
                  <Badge variant="outline" className="w-fit border-yellow-600 text-yellow-500 bg-yellow-950/30">Auto-signing...</Badge>
                )}
                <div className="flex items-center gap-4">
                  <img
                    src={authzInfo.config?.app?.icon}
                    alt=""
                    className="h-12 w-12 rounded-full bg-zinc-800"
                  />
                  <div className="flex flex-col gap-1">
                    <h1 className="text-sm font-bold text-gray-500">
                      User Signature Request from
                    </h1>
                    <h1 className="text-2xl font-bold text-gray-300">
                        {authzInfo.config?.app?.title}
                    </h1>
                  </div>
                </div>

                <div className="flex bg-zinc-800 items-center px-4 py-2 rounded-lg gap-2">
                  <RiGlobalLine className="text-lg text-blue-100" />
                  <span className="text-sm text-blue-100">
                    {authzInfo.config?.client?.hostname || "unknown"}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-400">Message</label>
                  <Textarea
                    readOnly
                    placeholder="Message to sign"
                    defaultValue={(() => {
                      try { return Buffer.from(authzInfo.body.message, 'hex').toString('utf8'); }
                      catch { return authzInfo.body.message; }
                    })()}
                    className="w-full max-h-30 bg-zinc-800/50 border-zinc-700 text-gray-300 resize-none"
                  />
                </div>

                {!store.autoSign && (
                  <div className="flex gap-4 h-12">
                    <Button
                      variant="outline"
                      className="w-full h-full border-zinc-700 hover:bg-zinc-800"
                      onClick={onReject}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="w-full h-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={onApproval}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UserSign;
