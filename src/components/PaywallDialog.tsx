
import { useEffect, useState } from "react";
import { ArrowRight, Check, Download, CreditCard } from "lucide-react";
import { loadStripe, StripeCardElement } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
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

// Initialize Stripe with the publishable key for client-side operations
// Use the betas flag as specified in the documentation
const stripePromise = loadStripe("pk_test_51JmBHWIN4GhAoTF7YlfJXFezdVSTbwnJLV7S8BSrFxAg1309b64GYzHikSVUTUWxOCnwHPAA1O1pOEECN2bah6k900qPP6IPnj", {
  betas: ['custom_checkout_beta_5'],
});

interface PaywallDialogProps {
  onDownload: () => void;
  trigger?: React.ReactNode;
}

export enum PaymentStatus {
  NOT_PAID = "not_paid",
  ONE_TIME_PAID = "one_time_paid",
  SUBSCRIPTION_ACTIVE = "subscription_active",
}

function CheckoutForm({ 
  priceId, 
  paymentType, 
  onPaymentSuccess, 
  onPaymentError 
}: { 
  priceId: string; 
  paymentType: 'one_time' | 'subscription'; 
  onPaymentSuccess: (paymentType: 'one_time' | 'subscription') => void; 
  onPaymentError: (error: Error) => void; 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      console.log("Creating payment intent with data:", { priceId, customerId: user.id, paymentType });
      
      // Step 1: Create payment intent via our edge function
      const response = await supabase.functions.invoke('create-payment-intent', {
        body: {
          priceId,
          customerId: user.id,
          paymentType,
          email: user.email,
        },
      });

      if (response.error) {
        console.error("Error from edge function:", response.error);
        throw new Error(response.error.message);
      }
      
      const { clientSecret } = response.data;
      console.log("Received client secret, confirming payment...");

      // Step 2: Confirm the payment with Stripe.js
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement) as StripeCardElement,
          billing_details: {
            email: user.email,
          },
        },
      });

      if (stripeError) {
        console.error("Stripe error during confirmation:", stripeError);
        throw new Error(stripeError.message || 'Payment failed');
      }
      
      console.log("Payment confirmed with status:", paymentIntent.status);

      if (paymentIntent.status === 'succeeded') {
        // Step 3: Update user record in database based on payment type
        if (paymentType === 'subscription') {
          console.log("Subscription payment succeeded, updating subscription status");
          const { error: dbError } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: user.id,
              subscription_status: 'active',
              subscription_type: 'subscription',
            }, { onConflict: 'user_id' });

          if (dbError) {
            console.error("Error updating subscription:", dbError);
            // Continue anyway since payment was successful
          }
        } else {
          // For one-time payments, we'll mark the transaction but not as an active subscription
          console.log("One-time payment succeeded, recording transaction");
          const { error: dbError } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: user.id,
              subscription_status: 'completed',  // Not 'active' for one-time purchases
              subscription_type: 'one_time',
            }, { onConflict: 'user_id' });

          if (dbError) {
            console.error("Error recording one-time payment:", dbError);
            // Continue anyway since payment was successful
          }
        }

        onPaymentSuccess(paymentType);
      } else {
        console.error("Payment status not successful:", paymentIntent.status);
        throw new Error('Payment processing failed');
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setErrorMessage(error.message || 'Payment failed. Please try again.');
      onPaymentError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true, // This removes the ZIP code field
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Card Details
        </label>
        <div className="border rounded-md p-3">
          <CardElement options={cardElementOptions} />
        </div>
      </div>
      
      {errorMessage && (
        <div className="text-red-500 text-sm">{errorMessage}</div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Now
          </>
        )}
      </Button>
    </form>
  );
}

export default function PaywallDialog({ onDownload, trigger }: PaywallDialogProps) {
  const [open, setOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.NOT_PAID);
  const [selectedPlan, setSelectedPlan] = useState<'one_time' | 'subscription' | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<'one_time' | 'subscription' | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Test mode Stripe product IDs
  const ONE_TIME_PRICE_ID = 'price_1Qwne7IN4GhAoTF7Ru6kQ8mq';
  const SUBSCRIPTION_PRICE_ID = 'price_1QwndqIN4GhAoTF7gUxlTCFx';

  useEffect(() => {
    // Reset payment status and selected plan when dialog opens/closes
    if (!open) {
      setSelectedPlan(null);
      setCurrentTransaction(null);
    } else {
      checkSubscriptionStatus();
    }
  }, [open]);

  // Check if user has active subscription
  const checkSubscriptionStatus = async () => {
    if (!user) {
      setPaymentStatus(PaymentStatus.NOT_PAID);
      return;
    }
    
    try {
      console.log("Checking subscription status for user:", user.id);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('subscription_status, subscription_type')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking subscription status:", error);
        setPaymentStatus(PaymentStatus.NOT_PAID);
        return;
      }
      
      console.log("Subscription data:", data);
      
      if (!data) {
        console.log("No subscription data found");
        setPaymentStatus(PaymentStatus.NOT_PAID);
      } else if (data.subscription_type === 'subscription' && data.subscription_status === 'active') {
        console.log("User has active subscription");
        setPaymentStatus(PaymentStatus.SUBSCRIPTION_ACTIVE);
        // If they have an active subscription, immediately download without showing modal
        if (open) {
          handleDownload();
        }
      } else if (data.subscription_type === 'one_time' && data.subscription_status === 'completed') {
        console.log("User has completed one-time purchase (but no active subscription)");
        setPaymentStatus(PaymentStatus.ONE_TIME_PAID);
      } else {
        console.log("User has no active subscription");
        setPaymentStatus(PaymentStatus.NOT_PAID);
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      setPaymentStatus(PaymentStatus.NOT_PAID);
    }
  };

  useEffect(() => {
    if (open && user) {
      checkSubscriptionStatus();
    }
  }, [open, user]);

  const handlePaymentSuccess = (paymentType: 'one_time' | 'subscription') => {
    if (paymentType === 'subscription') {
      setPaymentStatus(PaymentStatus.SUBSCRIPTION_ACTIVE);
    } else {
      setPaymentStatus(PaymentStatus.ONE_TIME_PAID);
    }
    
    setCurrentTransaction(paymentType);
    
    toast({
      title: "Payment successful",
      description: "Thank you for your purchase!",
    });
  };

  const handlePaymentError = (error: Error) => {
    setSelectedPlan(null);
    toast({
      title: "Payment failed",
      description: error.message || "Please try again or contact support.",
      variant: "destructive",
    });
  };

  const handleDownload = () => {
    onDownload();
    setOpen(false);
  };

  const selectPlan = (plan: 'one_time' | 'subscription') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in before making a purchase.",
        variant: "destructive",
      });
      setOpen(false);
      return;
    }
    
    setSelectedPlan(plan);
  };

  const goBackToPlans = () => {
    setSelectedPlan(null);
  };

  // Handle dialog trigger click
  const handleDialogTrigger = () => {
    // If user has an active subscription, download immediately without showing dialog
    if (paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE) {
      onDownload();
      return false; // Prevent dialog from opening
    }
    return true; // Allow dialog to open
  };

  // If user has active subscription, we don't need to show the dialog at all
  if (paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE) {
    return (
      <span onClick={onDownload}>
        {trigger}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // If trying to open the dialog but user has subscription, download instead
      if (newOpen && paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE) {
        onDownload();
      } else {
        setOpen(newOpen);
      }
    }}>
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
                  onClick={() => selectPlan('one_time')}
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
                  onClick={() => selectPlan('subscription')}
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
        
        {(paymentStatus === PaymentStatus.NOT_PAID || paymentStatus === PaymentStatus.ONE_TIME_PAID) && selectedPlan && (
          <>
            <DialogHeader>
              <DialogTitle>
                {selectedPlan === 'one_time' ? 'One-time Purchase' : 'Monthly Subscription'}
              </DialogTitle>
              <DialogDescription>
                Enter your payment details to complete your purchase.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Elements stripe={stripePromise}>
                <CheckoutForm 
                  priceId={selectedPlan === 'one_time' ? ONE_TIME_PRICE_ID : SUBSCRIPTION_PRICE_ID}
                  paymentType={selectedPlan}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </Elements>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={goBackToPlans}
                className="mr-auto"
              >
                Back to plans
              </Button>
            </DialogFooter>
          </>
        )}
        
        {currentTransaction && (
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
              {currentTransaction === 'subscription' && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Your subscription is now active. You can download any files without additional payments.
                </p>
              )}
              {currentTransaction === 'one_time' && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Your one-time purchase is complete. This allows you to download this file only.
                </p>
              )}
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
