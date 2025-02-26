
import { useState } from "react";
import { ArrowRight, Check, Download } from "lucide-react";
import { motion } from "framer-motion";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const handleOneTimePayment = async () => {
    setPaymentStatus(PaymentStatus.PROCESSING);
    
    try {
      // Redirect to checkout for one-time payment
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: 'price_one_time', // This would be your actual Stripe price ID
          quantity: 1,
          mode: 'payment',
        }),
      });
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
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
    setPaymentStatus(PaymentStatus.PROCESSING);
    
    try {
      // Redirect to checkout for subscription
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: 'price_subscription', // This would be your actual Stripe subscription price ID
          quantity: 1,
          mode: 'subscription',
        }),
      });
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
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
  };

  // Check if user is already subscribed
  const checkUserSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // User is logged in, check subscription status
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single();
      
      if (subscriptions) {
        // User has an active subscription
        setPaymentStatus(PaymentStatus.PAID);
      } else {
        // Check if user has made a one-time purchase
        const { data: purchases } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'succeeded')
          .single();
        
        if (purchases) {
          setPaymentStatus(PaymentStatus.PAID);
        }
      }
    }
  };

  // Mock for successful payment for demo purposes
  const simulateSuccessfulPayment = () => {
    setPaymentStatus(PaymentStatus.PAID);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (newOpen) {
        checkUserSubscription();
      }
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
                
                {/* Demo button for testing - Remove in production */}
                <Button 
                  onClick={simulateSuccessfulPayment}
                  variant="secondary"
                  className="w-full mt-4"
                >
                  Demo: Simulate Successful Payment
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
