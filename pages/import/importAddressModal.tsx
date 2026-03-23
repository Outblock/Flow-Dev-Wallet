import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { useState, FormEvent } from "react";

interface Account {
  address: string;
  [key: string]: any;
}

interface ImportAddressModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onOpenChange: (open: boolean) => void;
  accounts: Account[] | null;
  handleAddressSelection: (address: string) => void;
  importData: Account[] | null;
}

const ImportAddressModal = ({ isOpen, onOpen, onOpenChange, accounts, handleAddressSelection }: ImportAddressModalProps) => {
  console.log("accounts ==>", accounts)
  const [selectedAddress, setSelectedAddress] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleAddressSelection(selectedAddress || (accounts && accounts[0]?.address) || "");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-400">
            Account Found on Chain
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm font-semibold text-gray-300">
          Choose an account you want to import
        </p>
        <form id="address" onSubmit={handleSubmit}>
          <Select
            value={selectedAddress || (accounts && accounts[0]?.address) || ""}
            onValueChange={setSelectedAddress}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Flow Address" />
            </SelectTrigger>
            <SelectContent>
              {accounts && accounts.map((account) => (
                <SelectItem key={account.address} value={account.address}>
                  {account.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
        <DialogFooter className="flex gap-2">
          <Button
            variant="secondary"
            className="w-full h-12"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            form="address"
            type="submit"
            className="w-full h-12"
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportAddressModal;
