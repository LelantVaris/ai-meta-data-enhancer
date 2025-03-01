import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { FREE_TIER_LIMITS } from "@/lib/usage-limits";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
  // Calculate processing percentage
  const processingPercentage = totalEntries > 0 
    ? Math.round((processedEntries / totalEntries) * 100) 
    : 0;

  return (
    <div className="flex flex-col space-y-2 mb-2 md:mb-3 w-full">
      <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex justify-between items-center'} w-full`}>
        <h2 className="text-lg md:text-xl font-semibold">{dataLength} Items Enhanced</h2>
        <div className="flex items-center space-x-2">
          {isProcessing ? (
            <Button variant="outline" disabled className="px-2 md:px-3 text-xs md:text-sm" size={isMobile ? "sm" : "default"}>
              <Loader2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
              Processing...
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="px-2 md:px-3 text-xs md:text-sm"
                onClick={onReset}
              >
                <RotateCcw className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                Reset
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="px-2 md:px-3 text-xs md:text-sm"
                      onClick={onDownload}
                      disabled={!isPaidUser && dataLength > FREE_TIER_LIMITS.MAX_ENTRIES_PER_USE}
                    >
                      <Download className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                      {!isPaidUser && dataLength > FREE_TIER_LIMITS.MAX_ENTRIES_PER_USE ? 
                        (isMobile ? 'Upgrade' : 'Upgrade to Download') : 
                        'Download'}
                    </Button>
                  </TooltipTrigger>
                  {!isPaidUser && dataLength > FREE_TIER_LIMITS.MAX_ENTRIES_PER_USE && (
                    <TooltipContent>
                      <p className="text-xs">Free users can download up to {FREE_TIER_LIMITS.MAX_ENTRIES_PER_USE} items. Upgrade to download more.</p>
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
            className="h-1.5 md:h-2 mb-1"
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
