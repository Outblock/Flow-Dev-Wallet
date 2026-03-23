import { Textarea, Input, Button } from "@nextui-org/react";
import { StoreContext } from "../../contexts";
import { useEffect, useState, useContext } from "react";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { findAddressWithPK } from "../../utils/findAddressWithPK";
import { KEY_TYPE } from "../../utils/constants";

const JsonImport = ({onOpen, onImport}) => {
  const [isLoading, setLoading] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [json, setJson] = useState("")
  const [errorMesssage, setErrorMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible(!isVisible);

  const hasJsonStructure = (str) => {
    if (typeof str !== "string") return false;
    try {
      const result = JSON.parse(str);
      const type = Object.prototype.toString.call(result);
      return type === "[object Object]" || type === "[object Array]";
    } catch (err) {
      return false;
    }
  };

  const handleImport = async (e) => {
    try {
      setLoading(true)
      e.preventDefault();
      const keystore = e.target[0].value
      const password = e.target[1].value
      const address = e.target[3].value
      // Parse the JSON keystore and extract the private key hex directly.
      // Full keystore decryption (V3) is not supported without wallet-core.
      // Expect the JSON to contain a "privateKey" field as hex.
      const parsed = JSON.parse(keystore);
      const pkHex = parsed.privateKey || parsed.private_key;
      if (!pkHex) {
        throw new Error("JSON must contain a 'privateKey' field with hex-encoded private key");
      }
      const result = await findAddressWithPK(pkHex.replace(/^0x/, ""), address)
      console.log(result)
      if (!result) {
        onOpen();
        return;
      }
      const accounts = result.map((a) => ({...a, type: KEY_TYPE.KEYSTORE}))
      onImport(accounts);
    } finally {
      setLoading(false)
    }
  };

  const checkJSONImport = (event) => {
    setJson(event);
    if (event.length === 0) {
      setIsInvalid(false);
      setErrorMessage("");
      return false;
    }
    const result = hasJsonStructure(event);
    setIsInvalid(!result);
    setErrorMessage(!result ? "Not a valid json input" : "");
    return result;
  };

  return (
    <form
      id="keystore"
      onSubmit={handleImport}
      className="w-full flex flex-col gap-3 items-start justify-start"
    >
      <Textarea
        isInvalid={isInvalid}
        value={json}
        onValueChange={checkJSONImport}
        minRows={18}
        fullWidth
        isRequired
        label="JSON"
        placeholder="You can import the json file from other wallet (eg. Blocto)"
        className="grow"
        errorMessage={errorMesssage}
      />
      <Input
        isRequired
        label="Password"
        placeholder="Enter password for json file"
        endContent={
          <button
            className="focus:outline-none"
            type="button"
            onClick={toggleVisibility}
          >
            {isVisible ? (
              <IoMdEyeOff className="text-2xl text-default-400 pointer-events-none" />
            ) : (
              <IoMdEye className="text-2xl text-default-400 pointer-events-none" />
            )}
          </button>
        }
        type={isVisible ? "text" : "password"}
      />
     <Input
        label="Address"
        placeholder="Enter your flow address (Optional)"
        type="text"
      />
      <Button
        isLoading={isLoading}
        form="keystore"
        className="w-full"
        type="submit"
        color="primary"
      >
        Import
      </Button>
    </form>
  );
};

export default JsonImport;
