import { useState, useEffect, useRef } from "react";
import { ArrowRight, Check, Upload, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FREE_TIER_LIMITS } from "@/lib/usage-limits";
import PaywallDialog from "./PaywallDialog";
import { toast } from "@/hooks/use-toast";

interface UsageLimitPaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UsageLimitPaywallDialog({ open, onOpenChange }: UsageLimitPaywallDialogProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  const { user } = useAuth();
  const paywallTriggerRef = useRef<HTMLButtonElement>(null);

  // Effect to trigger the paywall dialog when showPaywall changes
  useEffect(() => {
    if (showPaywall && paywallTriggerRef.current) {
      paywallTriggerRef.current.click();
    }
  }, [showPaywall]);

  // Close this dialog when the user opens the payment dialog
  const handleUpgradeClick = () => {
    setShowPaywall(true);
    onOpenChange(false);
  };

  // Handle successful payment
  const handlePaymentComplete = () => {
    setShowPaywall(false);
    toast({
      title: "Premium access activated",
      description: "You now have premium access. You can upload files without limits.",
    });
    
    // Refresh the page to ensure all usage limits are properly updated
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Monthly Usage Limit Reached</DialogTitle>
            <DialogDescription className="text-neutral-600 mt-2">
              You've used all your free enhancements for this month.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                Free accounts are limited to {FREE_TIER_LIMITS.MAX_USES_PER_MONTH} uses per month with up to {FREE_TIER_LIMITS.MAX_ENTRIES_PER_USE} entries each time.
              </p>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Upgrade for unlimited access</CardTitle>
                <CardDescription>Choose a plan that works for you</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Unlimited monthly uses</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Process up to 500 entries at once</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Priority processing</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button onClick={handleUpgradeClick} className="w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade Now
                </Button>
              </CardFooter>
            </Card>
            
            <div className="text-center text-sm text-neutral-500">
              <p>Your free uses will reset at the beginning of next month.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Hidden PaywallDialog trigger */}
      <div style={{ display: 'none' }}>
        <PaywallDialog
          onDownload={handlePaymentComplete}
          trigger={
            <Button ref={paywallTriggerRef}>
              Open Paywall
            </Button>
          }
        />
      </div>
    </>
  );
} 