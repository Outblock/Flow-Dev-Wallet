import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { StoreContext } from "../../contexts";
import { useState, useContext, FormEvent } from "react";
import { findAddressWithKey } from "../../utils/findAddressWithPubKey";
import { pk2PubKey } from "../../utils/findAddressWithPK";
import { KEY_TYPE } from "../../utils/constants";
import { findAddressWithPK } from "../../utils/findAddressWithPK";

interface PrivateKeyImportProps {
  onOpen: () => void;
  onImport: (accounts: any[]) => void;
}

const PrivateKeyImport = ({ onOpen, onImport }: PrivateKeyImportProps) => {
  const { store, setStore } = useContext(StoreContext);
  const [isLoading, setLoading] = useState(false);

  const handleImport = async (e: FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true);
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const pk = (form[0] as HTMLInputElement).value.replace(/^0x/, "");
      const address = (form[1] as HTMLInputElement).value;
      const result = await findAddressWithPK(pk, address)
      if (!result){
        onOpen();
        return;
      }
      const accounts = result.map((a: any) => ({...a, type: KEY_TYPE.PRIVATE_KEY}))
      console.log("accounts ==>", accounts)
      onImport(accounts);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      id="privateKey"
      onSubmit={handleImport}
      className="w-full flex flex-col gap-3 items-start justify-start"
    >
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="private-key">Private Key</Label>
        <Input
          id="private-key"
          required
          type="text"
          placeholder="Enter your private key"
          className="font-mono"
        />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="pk-address">Address</Label>
        <Input
          id="pk-address"
          placeholder="Enter your flow address (Optional)"
          type="text"
        />
      </div>
      <Button
        form="privateKey"
        type="submit"
        disabled={isLoading}
        className="w-full font-bold"
      >
        {isLoading ? "Importing..." : "Import"}
      </Button>
    </form>
  );
};

export default PrivateKeyImport;
