import { useEffect, useState, useCallback, useRef } from "react";
import { ArrowRight, Check, Download, CreditCard, Mail, Lock } from "lucide-react";
import { loadStripe, StripeCardElement } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatus } from "@/types/payment";

// Use environment variable instead of hardcoded key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
  betas: ['custom_checkout_beta_5'],
});

interface PaywallDialogProps {
  onComplete: () => void;
  trigger?: React.ReactNode;
  defaultPlan?: 'one_time' | 'subscription' | null;
  skipPlanSelection?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  downloadAfterPayment?: boolean;
  onDownloadAfterPayment?: () => void;
}

interface StripeError {
  message?: string;
  type?: string;
  code?: string;
}

interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
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
    } catch (error: unknown) {
      console.error("Payment error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setErrorMessage(errorMessage);
      onPaymentError(error instanceof Error ? error : new Error(String(error)));
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

export default function PaywallDialog({ 
  onComplete, 
  trigger, 
  defaultPlan = null,
  skipPlanSelection = false,
  open = false,
  onOpenChange,
  downloadAfterPayment = false,
  onDownloadAfterPayment
}: PaywallDialogProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.NOT_PAID);
  const [selectedPlan, setSelectedPlan] = useState<'one_time' | 'subscription' | null>(defaultPlan);
  const [currentTransaction, setCurrentTransaction] = useState<'one_time' | 'subscription' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Store price IDs in environment variables or config
  // These are the production IDs you provided
  const ONE_TIME_PRICE_ID = 'price_1QwmgmIN4GhAoTF75P3B2Drd';
  const SUBSCRIPTION_PRICE_ID = 'price_1Qwmh1IN4GhAoTF78TJEw5Ek';

  // Use refs to break circular dependencies
  const handleDownloadRef = useRef<() => void>(() => {});
  
  // Define handleDownload first
  const handleDownload = useCallback(() => {
    onComplete();
    setShowSuccess(true);
    
    // Refresh the page to ensure UI updates correctly
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, [onComplete]);

  // Set the ref after defining the function
  useEffect(() => {
    handleDownloadRef.current = handleDownload;
  }, [handleDownload]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setPaymentStatus(PaymentStatus.NOT_PAID);
      console.log("[PaywallDialog] No user logged in, setting payment status to NOT_PAID");
      return;
    }
    
    try {
      console.log("[PaywallDialog] Checking subscription status for user:", user.id);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('subscription_status, subscription_type')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error("[PaywallDialog] Error checking subscription status:", error);
        console.error("[PaywallDialog] Error details:", JSON.stringify(error));
        setPaymentStatus(PaymentStatus.NOT_PAID);
        return;
      }
      
      console.log("[PaywallDialog] Subscription data:", data);
      
      if (!data) {
        console.log("[PaywallDialog] No subscription data found");
        setPaymentStatus(PaymentStatus.NOT_PAID);
      } else if (data.subscription_type === 'subscription' && data.subscription_status === 'active') {
        console.log("[PaywallDialog] User has active subscription");
        setPaymentStatus(PaymentStatus.SUBSCRIPTION_ACTIVE);
        // Only auto-download if not a new subscription (success screen already showing)
        if (open && !currentTransaction && !showSuccess) {
          console.log("[PaywallDialog] Auto-downloading due to active subscription");
          handleDownloadRef.current();
        }
      } else if (data.subscription_type === 'one_time' && data.subscription_status === 'completed') {
        console.log("[PaywallDialog] User has completed one-time purchase (but no active subscription)");
        setPaymentStatus(PaymentStatus.ONE_TIME_PAID);
      } else {
        console.log("[PaywallDialog] User has no active subscription, status:", data.subscription_status);
        setPaymentStatus(PaymentStatus.NOT_PAID);
      }
    } catch (error) {
      console.error("[PaywallDialog] Error checking payment status:", error);
      setPaymentStatus(PaymentStatus.NOT_PAID);
    }
  }, [user, open, currentTransaction, showSuccess]);

  useEffect(() => {
    if (!open) {
      // Only reset selectedPlan if we're not using skipPlanSelection
      if (!skipPlanSelection) {
        setSelectedPlan(null);
      } else {
        // Otherwise set to defaultPlan when dialog closes
        setSelectedPlan(defaultPlan);
      }
      setShowAuth(false);
      setCurrentTransaction(null);
      setShowSuccess(false);
      // Reset auth form
      setEmail("");
      setPassword("");
      setAuthError(null);
      setIsAuthProcessing(false);
    } else {
      // When dialog opens
      checkSubscriptionStatus();
      
      // If skipPlanSelection is true and user is not logged in, show auth directly
      if (skipPlanSelection && !user) {
        setShowAuth(true);
      }
    }
  }, [open, checkSubscriptionStatus, skipPlanSelection, defaultPlan, user]);

  // Check subscription status whenever user changes
  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    } else {
      setPaymentStatus(PaymentStatus.NOT_PAID);
    }
  }, [user, checkSubscriptionStatus]);

  // Add this effect after the other useEffect hooks
  useEffect(() => {
    // This effect handles what happens after authentication when skipPlanSelection is true
    if (user && skipPlanSelection && defaultPlan && !showSuccess && !currentTransaction) {
      // We have a logged-in user, skipPlanSelection is true, and we have a defaultPlan
      // Skip directly to the payment form with the defaultPlan
      setSelectedPlan(defaultPlan);
      setShowAuth(false);
    }
  }, [user, skipPlanSelection, defaultPlan, showSuccess, currentTransaction]);

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
        
        // If downloadAfterPayment is true, trigger the download
        if (downloadAfterPayment && onDownloadAfterPayment) {
          onDownloadAfterPayment();
        }
        
        // Call onComplete callback
        onComplete();
        
        // Close the dialog
        if (onOpenChange) {
          onOpenChange(false);
        }
        
        // Refresh the page after payment to update UI state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
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

  const selectPlan = (plan: 'one_time' | 'subscription') => {
    setSelectedPlan(plan);
    
    if (!user) {
      setShowAuth(true);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    setAuthError(null);
    
    try {
      // First attempt sign-in
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // If we get "Email not confirmed" error, attempt a direct auth flow instead
        if (error.message?.includes("Email not confirmed")) {
          console.log("Email not confirmed, attempting direct authentication");
          
          // Get user data directly if possible
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (!userError && userData.user) {
            console.log("Successfully authenticated unconfirmed user");
            
            toast({
              title: "Welcome back!",
              description: "You have successfully signed in.",
            });
            
            setShowAuth(false);
            
            // Refresh auth state
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            return;
          }
          
          // If we can't directly authenticate, show a more user-friendly error
          throw new Error("Please check your email for a confirmation link or try again with a different account");
        }
        
        throw error;
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      setShowAuth(false);
      
      // Refresh auth state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: unknown) {
      console.error("Sign in error:", error);
      setAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    setAuthError(null);
    
    try {
      // Sign up with automatic sign-in - no email confirmation needed
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // This will automatically authenticate the user without email confirmation
          data: {
            // You can add additional user metadata here if needed
            payment_flow: true
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "You have been automatically signed in and can proceed with your purchase.",
      });
      
      setShowAuth(false);
      
      // Refresh auth state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: unknown) {
      console.error("Sign up error:", error);
      
      // Check if error is "User already registered"
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already registered")) {
        // Try to sign in the user instead since they already have an account
        try {
          console.log("User already exists, attempting sign in");
          
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError) {
            toast({
              title: "Welcome back!",
              description: "You already had an account and have been signed in.",
            });
            
            setShowAuth(false);
            
            // Refresh auth state
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            return;
          }
          
          // If sign in fails, show original error
          setAuthError("This email is already registered. Please sign in instead.");
        } catch (signInError) {
          console.error("Auto sign-in failed:", signInError);
          setAuthError("This email is already registered. Please sign in instead.");
        }
      } else {
        setAuthError(errorMessage);
      }
    } finally {
      setIsAuthProcessing(false);
    }
  };

  // For subscription users, just attach the download function to the trigger
  if (paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE && !currentTransaction) {
    return (
      <span onClick={onComplete}>
        {trigger}
      </span>
    );
  }

  // Define what happens when the button is clicked
  const handleButtonClick = () => {
    // If user has subscription but not just completed payment
    if (paymentStatus === PaymentStatus.SUBSCRIPTION_ACTIVE && !currentTransaction) {
      onComplete();
      return;
    }
    
    // Otherwise open the dialog
    onOpenChange?.(true);
  };

  // Render the different dialog content based on the state
  const renderDialogContent = () => {
    if (showSuccess) {
      return (
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
            
            <div className="text-center text-xs text-muted-foreground">
              <p>If the UI doesn't update automatically, you can click the button below to refresh the page.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()} 
                className="mt-2"
              >
                Refresh Page
              </Button>
            </div>
          </div>
          
          <DialogFooter className="border-t p-4">
            <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </DialogFooter>
        </>
      );
    }
    
    if (showAuth) {
      return (
        <>
          <DialogHeader className="border-b p-4">
            <DialogTitle>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</DialogTitle>
            <DialogDescription>
              {authMode === 'signin' 
                ? 'Enter your credentials to access your account' 
                : 'Create a new account to continue with your purchase'}
            </DialogDescription>
          </DialogHeader>
          
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
          
          <DialogFooter className="border-t p-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setShowAuth(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </>
      );
    }
    
    if (selectedPlan && user) {
      return (
        <>
          <DialogHeader className="border-b p-4">
            <DialogTitle>
              {selectedPlan === 'one_time' ? 'One-time Purchase' : 'Monthly Subscription'}
            </DialogTitle>
            <DialogDescription>
              Enter your payment details to complete your purchase.
            </DialogDescription>
          </DialogHeader>
          
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
          
          <DialogFooter className="border-t p-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setSelectedPlan(null)}
              className="w-full"
            >
              Back
            </Button>
          </DialogFooter>
        </>
      );
    }
    
    // If skipPlanSelection is true and we have a defaultPlan, skip directly to login
    if (skipPlanSelection && defaultPlan && !user) {
      return (
        <>
          <DialogHeader className="border-b p-4">
            <DialogTitle>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</DialogTitle>
            <DialogDescription>
              {authMode === 'signin' 
                ? 'Enter your credentials to access your account' 
                : 'Create a new account to continue with your purchase'}
            </DialogDescription>
          </DialogHeader>
          
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
          
          <DialogFooter className="border-t p-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange?.(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </>
      );
    }
    
    // Default plan selection view with cards instead of buttons
    return (
      <>
        <DialogHeader className="border-b p-4">
          <DialogTitle>Download CSV</DialogTitle>
          <DialogDescription>
            Choose a payment option to download the enhanced meta data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className="relative overflow-hidden border-2 hover:border-gray-300 transition-all cursor-pointer"
              onClick={() => selectPlan('one_time')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">One-time Purchase</CardTitle>
                <CardDescription>Download this file only</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-3xl font-bold">$0.99</div>
                <p className="text-sm text-muted-foreground mt-2">Pay once for immediate access to your current CSV file.</p>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" className="w-full">
                  Select <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
            
            <Card 
              className="relative overflow-hidden border-2 border-primary hover:shadow-md transition-all cursor-pointer"
              onClick={() => selectPlan('subscription')}
            >
              <div className="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1 rounded-bl-lg">
                Recommended
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Monthly Subscription</CardTitle>
                <CardDescription>Unlimited downloads</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-3xl font-bold">$4.99<span className="text-sm font-normal">/mo</span></div>
                <p className="text-sm text-muted-foreground mt-2">Download unlimited CSV files every month, cancel anytime.</p>
              </CardContent>
              <CardFooter className="pt-2">
                <Button className="w-full">
                  Subscribe <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        
        <DialogFooter className="border-t p-4">
          <DialogClose asChild>
            <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button 
        onClick={handleButtonClick}
        asChild
      >
        {trigger || <Button>Open Paywall</Button>}
      </Button>
      
      {open && (
        <DialogContent className="p-0 sm:max-w-[550px]">
          {renderDialogContent()}
        </DialogContent>
      )}
    </Dialog>
  );
}
