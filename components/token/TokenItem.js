import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { fmtFlow } from "../../utils";

const TokenItem = ({ tokenInfo }) => {
  return (
    <div className="flex items-center gap-4 py-1">
      <Avatar className="h-8 w-8">
        <AvatarImage src={tokenInfo.icon} alt={tokenInfo.name} />
        <AvatarFallback className="text-xs bg-zinc-800">{tokenInfo.symbol?.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <h1 className="text-1xl text-gray-300">{tokenInfo.name}</h1>
      </div>
      <div className="flex items-center gap-1 justify-end grow">
        <h1 className="text-1xl font-mono text-gray-300">{tokenInfo.balance != null ? parseFloat(fmtFlow(tokenInfo.balance)).toFixed(2) : "0.00"}</h1>
        <h1 className="text-1xl text-gray-500 uppercase">{tokenInfo.symbol}</h1>
      </div>
    </div>
  );
};

export default TokenItem;
