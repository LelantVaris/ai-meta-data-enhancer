
import { useEffect, useState } from "react";
import { ArrowRight, Check, Download } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
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

// Initialize Stripe
const stripePromise = loadStripe('pk_test_51JmBHWIN4GhAoTF7hxK1ePDvtzAhTvzJbbV5JtZhHWGhkbcNeRSpQJ4TAXjDpTzS6TnQK4WPFl0HUvvSgWEGyNHs00ZsCbJCwJ');

interface PaywallDialogProps {
  onDownload: () => void;
  trigger?: React.ReactNode;
}

export enum PaymentStatus {
  NOT_PAID = "not_paid",
  PROCESSING = "processing",
  PAID = "paid",
}

interface PaymentFormData {
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export default function PaywallDialog({ onDownload, trigger }: PaywallDialogProps) {
  const [open, setOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.NOT_PAID);
  const [selectedPlan, setSelectedPlan] = useState<'one_time' | 'subscription' | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Test mode Stripe product IDs
  const ONE_TIME_PRICE_ID = 'price_1Qwne7IN4GhAoTF7Ru6kQ8mq';
  const SUBSCRIPTION_PRICE_ID = 'price_1QwndqIN4GhAoTF7gUxlTCFx';

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!open || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('subscription_status, subscription_type')
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

  const handlePayment = async (paymentType: 'one_time' | 'subscription') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in before making a purchase.",
        variant: "destructive",
      });
      setOpen(false);
      return;
    }

    setSelectedPlan(paymentType);
    setPaymentStatus(PaymentStatus.PROCESSING);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to initialize');

      const priceId = paymentType === 'one_time' ? ONE_TIME_PRICE_ID : SUBSCRIPTION_PRICE_ID;
      
      // Create payment intent
      const response = await supabase.functions.invoke('create-payment-intent', {
        body: {
          priceId,
          customerId: user.id,
          paymentType,
        },
      });

      if (response.error) throw new Error(response.error.message);
      
      const { clientSecret } = response.data;

      // Confirm the payment
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            // You would typically use stripe.elements() here
            // This is just for demonstration
            token: 'tok_visa', // Test token
          },
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Payment successful
      setPaymentStatus(PaymentStatus.PAID);
      toast({
        title: "Payment successful",
        description: "Thank you for your purchase!",
      });

    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentStatus(PaymentStatus.NOT_PAID);
      setSelectedPlan(null);
      toast({
        title: "Payment failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    onDownload();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Open Paywall</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {paymentStatus === PaymentStatus.NOT_PAID && !selectedPlan && (
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
                  onClick={() => handlePayment('one_time')}
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
                  onClick={() => handlePayment('subscription')}
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
              Please wait while we process your payment.
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
