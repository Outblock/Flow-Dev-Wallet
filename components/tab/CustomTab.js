import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { TAB } from "./Tab";

export const CustomTab = ({ setSelected, selected }) => {
  return (
    <TooltipProvider>
      <div className="flex w-full gap-6 h-16">
        {TAB.map((tab) => (
          <Tooltip key={tab.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelected(tab.id)}
                className="w-full h-full"
              >
                <div className={`text-2xl ${selected === tab.id ? "text-foreground" : "text-gray-500"}`}>
                  {tab.icon}
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tab.id}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
