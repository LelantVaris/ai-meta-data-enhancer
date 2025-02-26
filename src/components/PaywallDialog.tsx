
import { useEffect, useState } from "react";
import { ArrowRight, Check, Download, CreditCard, Mail, User, Lock, ArrowLeft } from "lucide-react";
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

type DialogStep = 'auth' | 'signin' | 'signup' | 'plans' | 'payment' | 'success';

export default function PaywallDialog({ onDownload, trigger }: PaywallDialogProps) {
  const [open, setOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.NOT_PAID);
  const [selectedPlan, setSelectedPlan] = useState<'one_time' | 'subscription' | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<'one_time' | 'subscription' | null>(null);
  const [currentStep, setCurrentStep] = useState<DialogStep>('plans');
  const { toast } = useToast();
  const { user } = useAuth();

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const ONE_TIME_PRICE_ID = 'price_1Qwne7IN4GhAoTF7Ru6kQ8mq';
  const SUBSCRIPTION_PRICE_ID = 'price_1QwndqIN4GhAoTF7gUxlTCFx';

  useEffect(() => {
    if (!open) {
      setSelectedPlan(null);
      setCurrentTransaction(null);
      // Reset to initial step based on user auth state
      resetDialogState();
    } else {
      checkSubscriptionStatus();
    }
  }, [open, user]);

  const resetDialogState = () => {
    // Reset auth form
    setEmail("");
    setPassword("");
    setAuthError(null);
    setIsAuthProcessing(false);
    
    // Set initial step based on user auth state
    if (!user) {
      setCurrentStep('auth');
    } else {
      // If user has active subscription, go to success directly
      if (paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE) {
        setCurrentStep('success');
      } else {
        setCurrentStep('plans');
      }
    }
  };

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
        if (open && !currentTransaction) {
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

  // Also check when dialog opens
  useEffect(() => {
    if (open && user) {
      checkSubscriptionStatus();
    }
  }, [open]);

  const handlePaymentSuccess = (paymentType: 'one_time' | 'subscription') => {
    if (paymentType === 'subscription') {
      setPaymentStatus(PaymentStatus.SUBSCRIPTION_ACTIVE);
    } else {
      setPaymentStatus(PaymentStatus.ONE_TIME_PAID);
    }
    
    setCurrentTransaction(paymentType);
    setCurrentStep('success');
    
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
      setCurrentStep('auth');
      return;
    }
    
    setSelectedPlan(plan);
    setCurrentStep('payment');
  };

  const goBackToPlans = () => {
    setSelectedPlan(null);
    setCurrentStep('plans');
  };

  const goBackToAuth = () => {
    setCurrentStep('auth');
    setEmail("");
    setPassword("");
    setAuthError(null);
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
      
      // Will automatically move to plans via useEffect
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
        description: "Check your email to confirm your account.",
      });
      
      // Go to signin after signup
      setCurrentStep('signin');
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
      if (newOpen) {
        resetDialogState();
      }
    }}>
      <DialogTrigger asChild>
        {trigger || <Button>Open Paywall</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {/* Auth selection screen */}
        {currentStep === 'auth' && (
          <>
            <DialogHeader>
              <DialogTitle>Sign in or create an account</DialogTitle>
              <DialogDescription>
                You need an account to continue with your purchase.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Button 
                onClick={() => setCurrentStep('signin')}
                className="w-full justify-between"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">Sign In</span>
                  <span className="text-xs text-muted-foreground">Already have an account</span>
                </div>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                onClick={() => setCurrentStep('signup')}
                variant="outline"
                className="w-full justify-between"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">Create Account</span>
                  <span className="text-xs text-muted-foreground">New to our service</span>
                </div>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
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
        
        {/* Sign In form */}
        {currentStep === 'signin' && (
          <>
            <DialogHeader>
              <DialogTitle>Sign In</DialogTitle>
              <DialogDescription>
                Enter your credentials to access your account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSignIn} className="space-y-4 py-4">
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
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between sm:justify-end items-center">
              <Button type="button" variant="ghost" onClick={goBackToAuth} className="mt-2 sm:mt-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="text-sm">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setCurrentStep('signup')}
                  className="text-primary font-medium hover:underline"
                >
                  Create one
                </button>
              </div>
            </DialogFooter>
          </>
        )}
        
        {/* Sign Up form */}
        {currentStep === 'signup' && (
          <>
            <DialogHeader>
              <DialogTitle>Create Account</DialogTitle>
              <DialogDescription>
                Create a new account to get started
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSignUp} className="space-y-4 py-4">
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
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
            <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between sm:justify-end items-center">
              <Button type="button" variant="ghost" onClick={goBackToAuth} className="mt-2 sm:mt-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setCurrentStep('signin')}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </div>
            </DialogFooter>
          </>
        )}
        
        {/* Initial plan selection */}
        {currentStep === 'plans' && (
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
        
        {/* Payment form */}
        {currentStep === 'payment' && selectedPlan && (
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
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to plans
              </Button>
            </DialogFooter>
          </>
        )}
        
        {/* Success message */}
        {currentStep === 'success' && (
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
              {!currentTransaction && paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Your subscription is active. You can download any files without additional payments.
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
