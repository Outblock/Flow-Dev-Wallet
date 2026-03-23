import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { useState, FormEvent } from "react";
import { findAddressWithSeed } from "../../utils/findAddressWithPK";
import { KEY_TYPE } from "../../utils/constants";

interface SeedPhraseImportProps {
  onOpen: () => void;
  onImport: (accounts: any[]) => void;
}

const SeedPhraseImport = ({ onOpen, onImport }: SeedPhraseImportProps) => {
  const [isLoading, setLoading] = useState(false);

  const handleImport = async (e: FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true);
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const seed = (form[0] as HTMLTextAreaElement).value.trim().split(/\s+/g).join(' ');
      const address = (form[1] as HTMLInputElement).value;
      const result = await findAddressWithSeed(seed, address)
      if (!result){
        onOpen();
        return;
      }
      const accounts = result.map((a: any) => ({...a, type: KEY_TYPE.SEED_PHRASE, mnemonic: seed}))
      onImport(accounts);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="seed" onSubmit={handleImport} className="w-full flex flex-col gap-3 items-start justify-start">
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="seed-phrase">Seed Phrase</Label>
        <Textarea
          id="seed-phrase"
          rows={8}
          required
          placeholder="Import 12 or 24 words split with whitespace"
          className="grow font-mono"
        />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="seed-address">Address</Label>
        <Input
          id="seed-address"
          placeholder="Enter your flow address (Optional)"
          type="text"
        />
      </div>
      <Button disabled={isLoading} type="submit" form="seed" className="w-full font-bold">
        {isLoading ? "Importing..." : "Import"}
      </Button>
    </form>
  );
};

export default SeedPhraseImport;
