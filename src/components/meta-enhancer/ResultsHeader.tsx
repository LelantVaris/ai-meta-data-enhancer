import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface ResultsHeaderProps {
  dataLength: number;
  onReset: () => void;
  onDownload: () => void;
  totalEntries: number;
  processedEntries: number;
  isProcessing: boolean;
}

const ResultsHeader = ({ 
  dataLength, 
  onReset, 
  onDownload, 
  totalEntries, 
  processedEntries, 
  isProcessing 
}: ResultsHeaderProps) => {
  // Use the centralized subscription status from AuthContext
  const { user, isPaidUser, subscriptionLoading } = useAuth();
  
  // Calculate processing percentage
  const processingPercentage = totalEntries > 0 
    ? Math.round((processedEntries / totalEntries) * 100) 
    : 0;

  return (
    <div className="flex flex-col space-y-2 mb-3 w-full">
      <div className="flex justify-between items-center w-full">
        <h2 className="text-xl font-semibold">{dataLength} Items Enhanced</h2>
        <div className="flex items-center space-x-2">
          {isProcessing ? (
            <Button variant="outline" disabled className="px-3">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="px-3"
                onClick={onReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="px-3"
                      onClick={onDownload}
                      disabled={!isPaidUser && dataLength > 5}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {!isPaidUser && dataLength > 5 ? 'Upgrade to Download' : 'Download'}
                    </Button>
                  </TooltipTrigger>
                  {!isPaidUser && dataLength > 5 && (
                    <TooltipContent>
                      <p>Free users can download up to 5 items. Upgrade to download more.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>
      
      {/* Processing progress bar */}
      {isProcessing && totalEntries > 0 && (
        <div className="w-full">
          <Progress 
            value={processingPercentage} 
            className="h-2 mb-1"
          />
          <p className="text-xs text-gray-500 text-right">
            Processing {processedEntries} of {totalEntries} items ({processingPercentage}%)
          </p>
        </div>
      )}
    </div>
  );
}

export default ResultsHeader;
