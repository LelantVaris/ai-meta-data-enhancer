import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface CopyButtonProps {
  onCopy: () => void;
  isCopied: boolean;
  isLoading?: boolean;
  label: string;
}

export const CopyButton = ({ onCopy, isCopied, isLoading, label }: CopyButtonProps) => {
  const isMobile = useIsMobile();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-5 w-5 md:h-6 md:w-6 p-0"
            onClick={onCopy}
            disabled={isLoading}
          >
            {isCopied ? (
              <Check className="h-2.5 w-2.5 md:h-3 md:w-3 text-green-500" />
            ) : (
              <Copy className="h-2.5 w-2.5 md:h-3 md:w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Copy {label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
