import { FaHashtag } from "react-icons/fa6";
import { TbMathMax } from "react-icons/tb";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { useContext, useEffect, useState } from "react";
import { StoreContext } from "../../contexts";
import { FLOW_BIP44_PATH, KEY_TYPE } from "../../utils/constants";

const KeyInfoCard = () => {
  const { store } = useContext(StoreContext);

  const [keyInfo, setKeyInfo] = useState(null);

  useEffect(() => {
    // With FLIP-264, passkeys don't expose private keys.
    // Just use whatever keyInfo is stored.
    if (store.keyInfo) {
      setKeyInfo(store.keyInfo);
    }
  }, []);

  return (
    <Card className="border-zinc-800 bg-zinc-800/50">
      {keyInfo && (
        <CardContent className="flex flex-col space-y-4 p-6">
          <div className="grid grid-cols-4 gap-4 overflow-auto">
            {keyInfo.mnemonic && <h6> Mnemonic </h6>}
            {keyInfo.mnemonic && (
              <div className="col-span-3">
                <code className="text-sm bg-black/50 px-2 py-1 rounded whitespace-normal text-gray-300">{keyInfo.mnemonic}</code>
              </div>
            )}

            {keyInfo.mnemonic && <h6> BIP44 Path </h6>}
            {keyInfo.mnemonic && (
              <div className="col-span-3">
                <code className="text-sm bg-black/50 px-2 py-1 rounded whitespace-normal w-full text-gray-300">
                  {FLOW_BIP44_PATH}
                </code>
              </div>
            )}

            {keyInfo.pk && <h6> Private Key </h6>}
            {keyInfo.pk && (
              <div className="col-span-3 place-self-auto h-auto min-h-fit">
                <div className="w-full break-all bg-black/50 rounded px-2 py-1">
                  <code className="text-sm text-gray-300 break-all whitespace-break-spaces">{keyInfo.pk}</code>
                </div>
              </div>
            )}

            {keyInfo.credentialId && <h6> Credential ID </h6>}
            {keyInfo.credentialId && (
              <div className="col-span-3">
                <div className="w-full break-all bg-black/50 rounded px-2 py-1">
                  <code className="text-sm text-gray-300 break-all whitespace-break-spaces">{keyInfo.credentialId}</code>
                </div>
              </div>
            )}

            {keyInfo.pubK && <h6> Public Key </h6>}
            {keyInfo.pubK && (
              <div className="col-span-3 ">
                <div className="w-full break-all bg-black/50 rounded px-2 py-1">
                  <code className="text-sm text-gray-300 break-all whitespace-break-spaces">{keyInfo.pubK}</code>
                </div>
              </div>
            )}

            <h6> Key Index </h6>
            <div className="col-span-3 ">
              <div className="w-full bg-black/50 rounded px-2 py-1">
                <code className="text-sm text-gray-300">{keyInfo.keyIndex}</code>
              </div>
            </div>

            <div className="col-span-4 justify-self-end">
              <div className="flex justify-self-end gap-4">
                <Badge variant="outline" className="border-zinc-700 text-gray-300 gap-1">
                  <TbMathMax className="h-3 w-3" />
                  {keyInfo.signAlgo}
                </Badge>

                <Badge variant="outline" className="border-zinc-700 text-gray-300 gap-1">
                  <FaHashtag className="h-3 w-3" />
                  {keyInfo.hashAlgo}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default KeyInfoCard;
