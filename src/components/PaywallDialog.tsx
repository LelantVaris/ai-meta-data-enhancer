
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

  // Test mode Stripe product IDs
  const ONE_TIME_PRICE_ID = 'price_1Qwne7IN4GhAoTF7Ru6kQ8mq'; // One-time purchase ID
  const SUBSCRIPTION_PRICE_ID = 'price_1QwndqIN4GhAoTF7gUxlTCFx'; // Subscription ID

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!open || !user) return;
      
      console.log("PaywallDialog: Checking subscription status for user", user.id);
      
      try {
        // Check if user has an active subscription
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('subscription_status, subscription_type')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error("PaywallDialog: Error checking subscription status:", error);
          setPaymentStatus(PaymentStatus.NOT_PAID);
          return;
        }
        
        console.log("PaywallDialog: Subscription data from DB:", data);
        
        if (data && data.subscription_status === 'active') {
          console.log("PaywallDialog: User has active subscription, setting to PAID");
          setPaymentStatus(PaymentStatus.PAID);
        } else {
          console.log("PaywallDialog: User does not have active subscription");
          setPaymentStatus(PaymentStatus.NOT_PAID);
        }
      } catch (error) {
        console.error("PaywallDialog: Error checking payment status:", error);
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
    console.log("PaywallDialog: Starting one-time payment flow");
    
    try {
      // Store current URL in localStorage before redirect
      const currentPath = window.location.pathname + window.location.search;
      console.log("PaywallDialog: Saving current path to localStorage:", currentPath);
      localStorage.setItem('returnTo', currentPath);
      localStorage.setItem('shouldDownload', 'true');
      
      console.log("PaywallDialog: Calling create-checkout-session function");
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          price: ONE_TIME_PRICE_ID,
          quantity: 1,
          mode: 'payment',
          customerId: user.id,
          purchaseType: 'one_time',
        },
      });
      
      if (error) {
        console.error("PaywallDialog: Error from create-checkout-session:", error);
        throw error;
      }
      
      console.log("PaywallDialog: Received checkout session data:", data);
      
      if (data?.url) {
        console.log("PaywallDialog: Redirecting to Stripe checkout:", data.url);
        window.location.href = data.url;
      } else {
        console.error("PaywallDialog: No URL returned from checkout session");
        setPaymentStatus(PaymentStatus.NOT_PAID);
        toast({
          title: "Error",
          description: "Could not redirect to checkout page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("PaywallDialog: Error redirecting to checkout:", error);
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
    console.log("PaywallDialog: Starting subscription payment flow");
    
    try {
      // Store current URL in localStorage before redirect
      const currentPath = window.location.pathname + window.location.search;
      console.log("PaywallDialog: Saving current path to localStorage:", currentPath);
      localStorage.setItem('returnTo', currentPath);
      localStorage.setItem('shouldDownload', 'true');
      
      console.log("PaywallDialog: Calling create-checkout-session function");
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
          mode: 'subscription',
          customerId: user.id,
          purchaseType: 'monthly',
        },
      });
      
      if (error) {
        console.error("PaywallDialog: Error from create-checkout-session:", error);
        throw error;
      }
      
      console.log("PaywallDialog: Received checkout session data:", data);
      
      if (data?.url) {
        console.log("PaywallDialog: Redirecting to Stripe checkout:", data.url);
        window.location.href = data.url;
      } else {
        console.error("PaywallDialog: No URL returned from checkout session");
        setPaymentStatus(PaymentStatus.NOT_PAID);
        toast({
          title: "Error",
          description: "Could not redirect to checkout page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("PaywallDialog: Error redirecting to subscription checkout:", error);
      setPaymentStatus(PaymentStatus.NOT_PAID);
      toast({
        title: "Error",
        description: "Could not process subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    console.log("PaywallDialog: Handling download");
    onDownload();
    setOpen(false);
    // Clear the download flag after successful download
    localStorage.removeItem('shouldDownload');
    console.log("PaywallDialog: Cleared shouldDownload flag");
  };

  // Auto-open dialog if returning from successful payment
  useEffect(() => {
    console.log("PaywallDialog: Payment status:", paymentStatus);
    console.log("PaywallDialog: shouldDownload flag:", localStorage.getItem('shouldDownload'));
    
    if (paymentStatus === PaymentStatus.PAID && localStorage.getItem('shouldDownload') === 'true') {
      console.log("PaywallDialog: Auto-opening dialog after successful payment");
      setOpen(true);
    }
  }, [paymentStatus]);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log("PaywallDialog: Dialog open state changing to:", newOpen);
      setOpen(newOpen);
    }}>
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
