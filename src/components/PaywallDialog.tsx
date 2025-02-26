
import { useEffect, useState } from "react";
import { ArrowRight, Check, Download, CreditCard, Mail, Lock, ArrowLeft } from "lucide-react";
import { loadStripe, StripeCardElement } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  InnerDialog,
  InnerDialogTrigger,
  InnerDialogContent,
  InnerDialogHeader,
  InnerDialogFooter,
  InnerDialogTitle,
  InnerDialogDescription,
} from "@/components/ui/nested-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

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
        // Store payment information in Supabase
        try {
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
              console.error("Error details:", JSON.stringify(dbError));
              // Continue anyway since payment was successful
            } else {
              console.log("Successfully updated subscription status");
            }
          } else {
            console.log("One-time payment succeeded, recording transaction");
            const { error: dbError } = await supabase
              .from('user_subscriptions')
              .upsert({
                user_id: user.id,
                subscription_status: 'completed',
                subscription_type: 'one_time',
              }, { onConflict: 'user_id' });

            if (dbError) {
              console.error("Error recording one-time payment:", dbError);
              console.error("Error details:", JSON.stringify(dbError));
              // Continue anyway since payment was successful
            } else {
              console.log("Successfully recorded one-time payment");
            }
          }
        } catch (dbError) {
          console.error("Database update error:", dbError);
          // Continue anyway since payment was successful
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
    hidePostalCode: true,
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
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const ONE_TIME_PRICE_ID = 'price_1Qwne7IN4GhAoTF7Ru6kQ8mq';
  const SUBSCRIPTION_PRICE_ID = 'price_1QwndqIN4GhAoTF7gUxlTCFx';

  useEffect(() => {
    if (!open) {
      setSelectedPlan(null);
      setCurrentTransaction(null);
      setShowSuccess(false);
      setShowAuthDialog(false);
      // Reset auth form
      setEmail("");
      setPassword("");
      setAuthError(null);
      setIsAuthProcessing(false);
    } else {
      checkSubscriptionStatus();
    }
  }, [open]);

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
        console.error("Error details:", JSON.stringify(error));
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
        // Only auto-download if not a new subscription (success screen already showing)
        if (open && !currentTransaction && !showSuccess) {
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

  // Check subscription status whenever user changes
  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    } else {
      setPaymentStatus(PaymentStatus.NOT_PAID);
    }
  }, [user]);

  const handlePaymentSuccess = (paymentType: 'one_time' | 'subscription') => {
    if (paymentType === 'subscription') {
      setPaymentStatus(PaymentStatus.SUBSCRIPTION_ACTIVE);
    } else {
      setPaymentStatus(PaymentStatus.ONE_TIME_PAID);
    }
    
    setCurrentTransaction(paymentType);
    setShowSuccess(true);
    
    toast({
      title: "Payment successful",
      description: "Thank you for your purchase!",
    });

    // Force a recheck of subscription status
    if (user) {
      setTimeout(() => {
        checkSubscriptionStatus();
      }, 1000); // Give a small delay to ensure DB update has propagated
    }
  };

  const handlePaymentError = (error: Error) => {
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
    setSelectedPlan(plan);
    
    if (!user) {
      setShowAuthDialog(true);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    setAuthError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      setShowAuthDialog(false);
      
    } catch (error: any) {
      console.error("Sign in error:", error);
      setAuthError(error.message);
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    setAuthError(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "Check your email to confirm your account, but you can proceed with payment now.",
      });
      
      setShowAuthDialog(false);
      
    } catch (error: any) {
      console.error("Sign up error:", error);
      setAuthError(error.message);
    } finally {
      setIsAuthProcessing(false);
    }
  };

  // For subscription users, just attach the download function to the trigger
  if (paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE && !currentTransaction) {
    return (
      <span onClick={onDownload}>
        {trigger}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // If dialog is opening and user has subscription but not just completed payment
      if (newOpen && paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE && !currentTransaction) {
        onDownload();
        return; // Don't open dialog
      }
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        {trigger || <Button>Open Paywall</Button>}
      </DialogTrigger>
      
      <DialogContent className="p-0 sm:max-w-[450px]">
        {/* Plan Selection */}
        {!showSuccess && (
          <>
            <DialogHeader className="border-b p-4">
              <DialogTitle>Download CSV</DialogTitle>
              <DialogDescription>
                Choose a payment option to download the enhanced meta data.
              </DialogDescription>
            </DialogHeader>
            
            <div className="p-4">
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
            
            <DialogFooter className="border-t p-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
        
        {/* Success View */}
        {showSuccess && (
          <>
            <DialogHeader className="border-b p-4">
              <DialogTitle>Thank You!</DialogTitle>
              <DialogDescription>
                Your payment was successful. You can now download the enhanced meta data.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center p-6 space-y-4">
              <div className="bg-green-100 rounded-full p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-medium">Payment Successful</h3>
              
              {currentTransaction === 'subscription' && (
                <p className="text-center text-sm text-muted-foreground">
                  Your subscription is now active. You can download any files without additional payments.
                </p>
              )}
              
              {currentTransaction === 'one_time' && (
                <p className="text-center text-sm text-muted-foreground">
                  Your one-time purchase is complete. This allows you to download this file only.
                </p>
              )}
            </div>
            
            <DialogFooter className="border-t p-4">
              <Button onClick={handleDownload} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </DialogFooter>
          </>
        )}
        
        {/* Authentication Inner Dialog */}
        <InnerDialog>
          {showAuthDialog && (
            <InnerDialogContent className="sm:max-w-[400px] p-0">
              <InnerDialogHeader className="border-b p-4">
                <InnerDialogTitle>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</InnerDialogTitle>
                <InnerDialogDescription>
                  {authMode === 'signin' 
                    ? 'Enter your credentials to access your account' 
                    : 'Create a new account to continue with your purchase'}
                </InnerDialogDescription>
              </InnerDialogHeader>
              
              <div className="p-4">
                <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  {authError && (
                    <div className="text-red-500 text-sm">{authError}</div>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isAuthProcessing}>
                    {isAuthProcessing ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        {authMode === 'signin' ? 'Signing in...' : 'Creating account...'}
                      </>
                    ) : (
                      <>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</>
                    )}
                  </Button>
                </form>
                
                <div className="mt-4 text-center text-sm">
                  {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    className="ml-1 font-medium text-primary hover:underline"
                  >
                    {authMode === 'signin' ? "Create one" : "Sign in"}
                  </button>
                </div>
              </div>
              
              <InnerDialogFooter className="border-t p-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowAuthDialog(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </InnerDialogFooter>
            </InnerDialogContent>
          )}
        </InnerDialog>
        
        {/* Payment Inner Dialog */}
        <InnerDialog>
          {selectedPlan && user && !showSuccess && (
            <InnerDialogContent className="sm:max-w-[400px] p-0" position="top">
              <InnerDialogHeader className="border-b p-4">
                <InnerDialogTitle>
                  {selectedPlan === 'one_time' ? 'One-time Purchase' : 'Monthly Subscription'}
                </InnerDialogTitle>
                <InnerDialogDescription>
                  Enter your payment details to complete your purchase.
                </InnerDialogDescription>
              </InnerDialogHeader>
              
              <div className="p-4">
                <Elements stripe={stripePromise}>
                  <CheckoutForm 
                    priceId={selectedPlan === 'one_time' ? ONE_TIME_PRICE_ID : SUBSCRIPTION_PRICE_ID}
                    paymentType={selectedPlan}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                </Elements>
              </div>
              
              <InnerDialogFooter className="border-t p-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setSelectedPlan(null)}
                  className="w-full"
                >
                  Back
                </Button>
              </InnerDialogFooter>
            </InnerDialogContent>
          )}
        </InnerDialog>
      </DialogContent>
    </Dialog>
  );
}
