import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { StoreContext } from "../../contexts";
import { useContext } from "react";
import { signOut } from "../../account";

const ErrorCard = () => {
  const { store, setStore } = useContext(StoreContext);

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-zinc-800">
        <CardContent className="flex flex-col space-y-4 p-6">
          <div className="flex items-center gap-4">
            <h1 className="md:text-3xl text-lg font-bold text-gray-300">Oops!</h1>
          </div>
          <p className="text-sm text-gray-500 pb-3">
            Sorry, it looks something is not working. Could you try again later?
          </p>

          <Button
            className="bg-[#00EF8B] text-black hover:bg-[#00d67d] font-semibold"
            onClick={async () => {
              setStore({});
              signOut();
              window.location.reload();
            }}
          >
            OK
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorCard;
