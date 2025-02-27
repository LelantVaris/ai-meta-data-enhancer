import { Info } from "lucide-react";
import { getUsageLimitMessage, getRemainingUses, FREE_TIER_LIMITS } from "@/lib/usage-limits";
import PaywallDialog from "@/components/PaywallDialog";
import { Button } from "@/components/ui/button";

interface UsageLimitBannerProps {
  isPaidUser: boolean;
}

const UsageLimitBanner = ({ isPaidUser }: UsageLimitBannerProps) => {
  const usageLimitMessage = getUsageLimitMessage(isPaidUser);
  const remainingUses = getRemainingUses();
  const showUpgradePrompt = !isPaidUser && remainingUses === 1; // Only show upgrade prompt when down to last use

  // Placeholder function for PaywallDialog onDownload prop
  const placeholderDownload = () => {
    // This won't be called in this context
    console.log("Placeholder download function");
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-neutral-50 p-3 rounded-md mb-4">
      <div className="flex items-center mb-2 md:mb-0">
        <Info className="h-4 w-4 text-neutral-500 mr-2" />
        <span className="text-sm text-neutral-700">{usageLimitMessage}</span>
      </div>
      
      {showUpgradePrompt && !isPaidUser && (
        <PaywallDialog
          onDownload={placeholderDownload}
          trigger={
            <Button 
              variant="outline"
              size="sm"
              className="text-sm border-neutral-200 bg-white hover:bg-neutral-100"
            >
              Upgrade for premium access
            </Button>
          }
        />
      )}
      
      {isPaidUser && (
        <span className="text-sm font-medium text-green-600">
          Premium Access ✓
        </span>
      )}
    </div>
  );
};

export default UsageLimitBanner; 