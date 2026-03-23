import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { useState, ChangeEvent, FormEvent } from "react";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { findAddressWithPK } from "../../utils/findAddressWithPK";
import { KEY_TYPE } from "../../utils/constants";

interface JsonImportProps {
  onOpen: () => void;
  onImport: (accounts: any[]) => void;
}

const JsonImport = ({onOpen, onImport}: JsonImportProps) => {
  const [isLoading, setLoading] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [json, setJson] = useState("")
  const [errorMesssage, setErrorMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible(!isVisible);

  const hasJsonStructure = (str: string): boolean => {
    if (typeof str !== "string") return false;
    try {
      const result = JSON.parse(str);
      const type = Object.prototype.toString.call(result);
      return type === "[object Object]" || type === "[object Array]";
    } catch (err) {
      return false;
    }
  };

  const handleImport = async (e: FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true)
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const keystore = (form[0] as HTMLTextAreaElement).value;
      const password = (form[1] as HTMLInputElement).value;
      const address = (form[3] as HTMLInputElement).value;
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
      const accounts = result.map((a: any) => ({...a, type: KEY_TYPE.KEYSTORE}))
      onImport(accounts);
    } finally {
      setLoading(false)
    }
  };

  const checkJSONImport = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setJson(value);
    if (value.length === 0) {
      setIsInvalid(false);
      setErrorMessage("");
      return false;
    }
    const result = hasJsonStructure(value);
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
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="json-input">JSON</Label>
        <Textarea
          id="json-input"
          value={json}
          onChange={checkJSONImport}
          rows={8}
          required
          placeholder="You can import the json file from other wallet (eg. Blocto)"
          className={`grow font-mono ${isInvalid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
        />
        {isInvalid && errorMesssage && (
          <p className="text-xs text-red-500">{errorMesssage}</p>
        )}
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="json-password">Password</Label>
        <div className="relative">
          <Input
            id="json-password"
            required
            placeholder="Enter password for json file"
            type={isVisible ? "text" : "password"}
            className="pr-10"
          />
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
            type="button"
            onClick={toggleVisibility}
          >
            {isVisible ? (
              <IoMdEyeOff className="text-xl text-muted-foreground" />
            ) : (
              <IoMdEye className="text-xl text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="json-address">Address</Label>
        <Input
          id="json-address"
          placeholder="Enter your flow address (Optional)"
          type="text"
        />
      </div>
      <Button
        disabled={isLoading}
        form="keystore"
        className="w-full"
        type="submit"
      >
        {isLoading ? "Importing..." : "Import"}
      </Button>
    </form>
  );
};

export default JsonImport;
