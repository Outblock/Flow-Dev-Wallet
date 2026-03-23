import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { StoreContext } from "../contexts";
import { useEffect, useState, useContext } from "react";
import * as fcl from "@onflow/fcl";
import { RiGlobalLine } from "react-icons/ri";
import { FaCircleCheck } from "react-icons/fa6";
import { encode } from "@onflow/rlp"
import { signWithKey } from "../utils/sign";

interface ConnectProps {
  address: string;
}

interface AuthnInfo {
  config: {
    app: {
      icon: string;
      title: string;
    };
    client: {
      hostname: string;
    };
  };
  body?: {
    nonce?: string;
    appIdentifier?: string;
  };
}

const Connect = ({ address }: ConnectProps) => {
  const { store, setStore } = useContext(StoreContext);
  const [authnInfo, setAuthnInfo] = useState<AuthnInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const callback = (msg: AuthnInfo) => {
      console.log("msg ==>", msg, store.address);
      setAuthnInfo(msg);
      if (store.address) {
        setOpen(true);
      }
    };
    try {
      fcl.WalletUtils.ready(callback);
    } catch (err) {}

    window.addEventListener("message", (d: MessageEvent) => {
      console.log("Harness Message Received", d.data);
    });
  }, [store.address]);

  const onApproval = async () => {
    const response: Record<string, any> = {
        f_type: "AuthnResponse",
        f_vsn: "1.0.0",
        addr: store.address,
        network: store.network,
        services: [
          {
            type: "authn",
            uid: "fpk#authn",
            f_type: "Service",
            f_vsn: "1.0.0",
            id: store.address,
            identity: {
              address: store.address,
            },
            provider: {
              address: "0x7179def56a8b9c5e",
              description: "A wallet created for everyone.",
              f_type: "ServiceProvider",
              f_vsn: "1.0.0",
              icon: "https://lilico.app/fcw-logo.png",
              name: "Flow PassKey",
            },
          },
          {
            endpoint: `${window.location.origin}/authz`,
            f_type: "Service",
            f_vsn: "1.0.0",
            identity: { address: store.address, keyId: store.keyInfo.keyIndex },
            method: "POP/RPC",
            network: store.network,
            type: "authz",
            uid: "fpk#authz",
          },
          {
            endpoint: `${window.location.origin}/api/preAuthz`,
            f_type: "Service",
            f_vsn: "1.0.0",
            identity: {
              address: store.network === "emulator" ? process.env.emulatorServiceAddress : process.env.payerAddress,
              keyId: store.network === "emulator" ? 0 : process.env.payerKeyIndex,
            },
            method: "HTTP/POST",
            network: store.network,
            type: "pre-authz",
            uid: "fpk#pre-authz",
            params: {
              address: store.address,
              keyId: parseInt(store.keyInfo.keyIndex)
            }
          },
          {
              endpoint: `${window.location.origin}/userSign`,
              f_type: "Service",
              f_vsn: "1.0.0",
              method: "POP/RPC",
              network: store.network,
              type: "user-signature",
              uid: "fpk#user-signature",
          }
        ],
    }

    if (authnInfo?.body?.nonce && authnInfo.body?.appIdentifier && store.id) {
        console.log('rlp ==>', store.address, authnInfo.body?.nonce, authnInfo.body?.appIdentifier)
        const combind = fcl.WalletUtils.encodeAccountProof({appIdentifier: authnInfo.body?.appIdentifier, address: store.address, nonce: authnInfo.body?.nonce})
        const result = await signWithKey(store, combind)
        const compSig: Record<string, any> = {
            f_type: "CompositeSignature",
            f_vsn: "1.0.0",
            addr: store.address,
            keyId: parseInt(store.keyInfo.keyIndex),
            signature: result.signature,
        };
        if (result.extensionData) {
            compSig.extensions = [result.extensionData];
        }
        response.services.push(
            {
                endpoint: `${window.location.origin}/acct-proof`,
                f_type: "Service",
                f_vsn: "1.0.0",
                method: "POP/RPC",
                network: store.network,
                type: "account-proof",
                uid: "fpk#user-signature",
                data: {
                    f_type: "account-proof",
                    f_vsn: "2.0.0",
                    address: store.address,
                    nonce: authnInfo.body?.nonce,
                    signatures: [compSig]
                }
            }
        )

    }
    fcl.WalletUtils.approve(response);
  };

  const onReject = () => {
    fcl.WalletUtils.decline("Declined by user.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="dark bg-zinc-900 border-zinc-800 sm:max-w-md">
        {authnInfo && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <img
                  src={authnInfo.config.app.icon}
                  alt=""
                  className="h-12 w-12 rounded-full bg-zinc-800"
                />
                <div className="flex flex-col gap-1">
                  <DialogTitle className="text-base font-bold text-gray-500">
                    Connecting to
                  </DialogTitle>
                  <p className="text-2xl font-bold text-gray-300">
                    {authnInfo.config.app.title}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Card className="border-zinc-800 bg-zinc-800/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <RiGlobalLine className="text-lg text-blue-100" />
                    <span className="text-lg font-normal text-blue-100">
                      {authnInfo.config.client.hostname}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-zinc-800 bg-zinc-800/50">
                <CardContent className="p-3">
                  <p className="text-base font-normal text-gray-500 uppercase mb-3">
                    This App would like to
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <FaCircleCheck className="text-emerald-500" />
                      <p>View your wallet balance and activity</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCircleCheck className="text-emerald-500" />
                      <p>Request approval for transactions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                className="w-full h-12 border-zinc-700 hover:bg-zinc-800"
                onClick={() => {
                  setOpen(false);
                  onReject();
                }}
              >
                Cancel
              </Button>
              <Button
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={async () => {
                  setOpen(false);
                  await onApproval();
                }}
              >
                Connect
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Connect;
