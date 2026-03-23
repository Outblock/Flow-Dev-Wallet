import { FaHashtag } from "react-icons/fa6";
import { TbMathMax } from "react-icons/tb";
import { Snippet, Card, CardBody, Code, Chip } from "@nextui-org/react";
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
    <Card>
      {keyInfo && (
        <CardBody className="flex flex-col space-y-4 p-6">
          {/* <div className="flex items-center gap-4">
          <FaArrowDownWideShort className="text-2xl" />
          <h1 className="text-2xl font-bold text-gray-300"> Result </h1>
        </div>
        <Divider /> */}

          <div className="grid grid-cols-4 gap-4 overflow-auto">
            {/* {store.address && <h6> Address </h6>}
          {store.address && (
            <div className="col-span-3">
              <Code className="whitespace-normal">{store.address}</Code>
            </div>
          )} */}

            {keyInfo.mnemonic && <h6> Mnemonic </h6>}
            {keyInfo.mnemonic && (
              <div className="col-span-3">
                <Code className="whitespace-normal">{keyInfo.mnemonic}</Code>
              </div>
            )}

            {keyInfo.mnemonic && <h6> BIP44 Path </h6>}
            {keyInfo.mnemonic && (
              <div className="col-span-3">
                <Code className="whitespace-normal w-full">
                  {FLOW_BIP44_PATH}
                </Code>
              </div>
            )}

            {keyInfo.pk && <h6> Private Key </h6>}
            {keyInfo.pk && (
              <div className="col-span-3 place-self-auto h-auto min-h-fit">
                <Snippet symbol="" classNames={{base: "w-full break-all dark", content: "dark bg-black", pre:["break-all", "whitespace-break-spaces"]}}>{keyInfo.pk}</Snippet>
              </div>
            )}

            {keyInfo.credentialId && <h6> Credential ID </h6>}
            {keyInfo.credentialId && (
              <div className="col-span-3">
                <Snippet symbol="" classNames={{base: "w-full break-all dark", content: "dark bg-black", pre:["break-all", "whitespace-break-spaces"]}}>{keyInfo.credentialId}</Snippet>
              </div>
            )}

            {keyInfo.pubK && <h6> Public Key </h6>}
            {keyInfo.pubK && (
              <div className="col-span-3 ">
                <Snippet symbol="" classNames={{base: "w-full break-all dark", content: "dark bg-black", pre:["break-all", "whitespace-break-spaces"]}}>{keyInfo.pubK}</Snippet>
              </div>
            )}

            <h6> Key Index </h6>
            <div className="col-span-3 ">
              <Snippet symbol="" className="whitespace-normal w-full">{keyInfo.keyIndex}</Snippet>
            </div>

            <div className="col-span-4 justify-self-end">
              <div className="flex justify-self-end gap-4">
                <Chip startContent={<TbMathMax />}  variant="faded">
                  {keyInfo.signAlgo}
                </Chip>

                <Chip startContent={<FaHashtag />} variant="faded">
                {keyInfo.hashAlgo}
                </Chip>
              </div>
            </div>
          </div>
        </CardBody>
      )}
    </Card>
  );
};

export default KeyInfoCard;
