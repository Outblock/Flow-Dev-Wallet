import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { StoreContext } from "../../contexts";
import { useContext } from "react";
import { signOut } from "../../account";

interface SignOutProps {
  isOpen: boolean;
  onOpen: () => void;
  onOpenChange: (open: boolean) => void;
}

const SignOut = ({ isOpen, onOpen, onOpenChange }: SignOutProps) => {
  const { store, setStore } = useContext(StoreContext);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-400">
            Confirmation
          </DialogTitle>
        </DialogHeader>
        <p className="text-2xl font-bold text-gray-300">
          Are you sure you want to sign out ?
        </p>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="w-full h-12 border-zinc-700 hover:bg-zinc-800"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="w-full h-12"
            onClick={() => {
              setStore({});
              signOut();
              onOpenChange(false);
            }}
          >
            Sign Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignOut;
