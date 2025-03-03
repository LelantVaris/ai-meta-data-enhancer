import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface DownloadPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
  onSubscribe: () => void;
}

const DownloadPromptDialog = ({
  open,
  onOpenChange,
  onDownload,
  onSubscribe
}: DownloadPromptDialogProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Your Enhanced Meta Tags Are Ready!</DialogTitle>
          <DialogDescription className="text-neutral-600 pt-2">
            {user ? 
              "You can download your enhanced meta tags now, or upgrade to our premium plan for unlimited downloads and enhanced features." :
              "You can download your enhanced meta tags now, or create an account to access unlimited downloads and enhanced features."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Centered Download Button */}
          <Button 
            variant="outline" 
            size="lg"
            className="w-full max-w-xs flex items-center justify-center gap-2"
            onClick={() => {
              onDownload();
              onOpenChange(false);
            }}
          >
            <Download className="h-5 w-5" />
            Download CSV
          </Button>
          
          {/* Premium Plan Card with Gradient Background */}
          <div className="w-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-lg p-6 flex flex-col items-center text-center">
            <div className="bg-primary/20 p-3 rounded-full mb-3">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium text-lg mb-1">Premium Plan</h3>
            <p className="text-sm text-neutral-600 mb-2">Unlimited downloads and enhanced features</p>
            <p className="text-xl font-bold text-primary mb-4">$4.99<span className="text-sm font-normal">/month</span></p>
            <Button 
              variant="default" 
              className="w-full max-w-xs"
              onClick={() => {
                onSubscribe();
                onOpenChange(false);
              }}
            >
              {user ? "Upgrade Now" : "Create Account"}
            </Button>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
          <p className="text-xs text-neutral-500 mb-2 sm:mb-0">
            No credit card required for free downloads. Cancel premium subscription anytime.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadPromptDialog; 