
import { useEffect, useState } from "react";
import { ArrowRight, Check, Download } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface PaywallDialogProps {
  onDownload: () => void;
  trigger?: React.ReactNode;
}

export enum PaymentStatus {
  NOT_PAID = "not_paid",
  PROCESSING = "processing",
  PAID = "paid",
}

export default function PaywallDialog({ onDownload, trigger }: PaywallDialogProps) {
  const [open, setOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.NOT_PAID);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!open || !user) return;
      
      try {
        // Check if user has an active subscription
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('subscription_status')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error("Error checking subscription status:", error);
          setPaymentStatus(PaymentStatus.NOT_PAID);
          return;
        }
        
        if (data && data.subscription_status === 'active') {
          setPaymentStatus(PaymentStatus.PAID);
        } else {
          setPaymentStatus(PaymentStatus.NOT_PAID);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        setPaymentStatus(PaymentStatus.NOT_PAID);
      }
    };
    
    checkSubscriptionStatus();
  }, [open, user]);

  const handleOneTimePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in before making a purchase.",
        variant: "destructive",
      });
      setOpen(false);
      return;
    }
    
    setPaymentStatus(PaymentStatus.PROCESSING);
    
    try {
      // Store current URL in localStorage before redirect
      localStorage.setItem('returnTo', window.location.pathname + window.location.search);
      localStorage.setItem('shouldDownload', 'true');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          price: 'price_1QwmgmIN4GhAoTF75P3B2Drd', // One-time purchase product ID
          quantity: 1,
          mode: 'payment',
          customerId: user.id,
          purchaseType: 'one_time',
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setPaymentStatus(PaymentStatus.NOT_PAID);
        toast({
          title: "Error",
          description: "Could not redirect to checkout page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error redirecting to checkout:", error);
      setPaymentStatus(PaymentStatus.NOT_PAID);
      toast({
        title: "Error",
        description: "Could not process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubscription = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in before subscribing.",
        variant: "destructive",
      });
      setOpen(false);
      return;
    }
    
    setPaymentStatus(PaymentStatus.PROCESSING);
    
    try {
      // Store current URL in localStorage before redirect
      localStorage.setItem('returnTo', window.location.pathname + window.location.search);
      localStorage.setItem('shouldDownload', 'true');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          price: 'price_1Qwmh1IN4GhAoTF78TJEw5Ek', // Subscription product ID
          quantity: 1,
          mode: 'subscription',
          customerId: user.id,
          purchaseType: 'monthly',
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setPaymentStatus(PaymentStatus.NOT_PAID);
        toast({
          title: "Error",
          description: "Could not redirect to checkout page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error redirecting to subscription checkout:", error);
      setPaymentStatus(PaymentStatus.NOT_PAID);
      toast({
        title: "Error",
        description: "Could not process subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    onDownload();
    setOpen(false);
    // Clear the download flag after successful download
    localStorage.removeItem('shouldDownload');
  };

  // Auto-open dialog if returning from successful payment
  useEffect(() => {
    if (paymentStatus === PaymentStatus.PAID && localStorage.getItem('shouldDownload') === 'true') {
      setOpen(true);
    }
  }, [paymentStatus]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Open Paywall</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {paymentStatus === PaymentStatus.NOT_PAID && (
          <>
            <DialogHeader>
              <DialogTitle>Download CSV</DialogTitle>
              <DialogDescription>
                Choose a payment option to download the enhanced meta data.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  onClick={handleOneTimePayment}
                  className="w-full justify-between"
                  variant="outline"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">One-time Purchase</span>
                    <span className="text-xs text-muted-foreground">Download this file only</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold">$0.99</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </Button>
                
                <Button 
                  onClick={handleSubscription}
                  className="w-full justify-between"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Monthly Subscription</span>
                    <span className="text-xs text-muted-foreground">Unlimited downloads</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold">$3.99/mo</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
        
        {paymentStatus === PaymentStatus.PROCESSING && (
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <h3 className="mt-4 text-lg font-medium">Processing Payment...</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Please don't close this window.
            </p>
          </div>
        )}
        
        {paymentStatus === PaymentStatus.PAID && (
          <>
            <DialogHeader>
              <DialogTitle>Thank You!</DialogTitle>
              <DialogDescription>
                Your payment was successful. You can now download the enhanced meta data.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="bg-green-100 rounded-full p-2">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium">Payment Successful</h3>
            </div>
            <DialogFooter>
              <Button onClick={handleDownload} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
