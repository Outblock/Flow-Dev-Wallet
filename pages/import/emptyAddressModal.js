import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";

const EmptyAddressModal = ({ isOpen, onOpen, onOpenChange }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-400">
            No Address Found
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm font-semibold text-gray-300">
          We can&#39;t find any address on flow with this key. Please check your input and try again.
        </p>
        <DialogFooter>
          <Button
            variant="secondary"
            className="w-full h-12"
            onClick={() => onOpenChange(false)}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmptyAddressModal;
