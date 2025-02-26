
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyButtonProps {
  onCopy: () => void;
  isCopied: boolean;
  isLoading?: boolean;
  label: string;
}

export const CopyButton = ({ onCopy, isCopied, isLoading, label }: CopyButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onCopy}
            disabled={isLoading}
          >
            {isCopied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
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
