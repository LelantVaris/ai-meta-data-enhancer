import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import MetaEnhancer from "@/components/MetaEnhancer";
import Hero from "@/components/Hero";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BrandLayout from "@/components/layout/BrandLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import React from "react";
import { getEnhancedDataBySessionId, associateEnhancedDataWithUser } from "@/lib/enhanced-data";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, checkSubscriptionStatus } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Check for payment status in URL
  const paymentStatus = searchParams.get("payment_status");
  const signupParam = searchParams.get("signup");
  const subscribeParam = searchParams.get("subscribe");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState<"signin" | "signup">("signin");
  
  // Handle signup and subscribe parameters
  useEffect(() => {
    if (signupParam === 'true') {
      // Show the auth modal with signup view
      setAuthModalView('signup');
      setShowAuthModal(true);
      
      // Store the subscribe parameter in localStorage
      if (subscribeParam === 'true') {
        localStorage.setItem('subscribeAfterSignup', 'true');
      }
      
      // Remove the parameters from the URL
      setSearchParams(prev => {
        prev.delete("signup");
        prev.delete("subscribe");
        return prev;
      });
    }
  }, [signupParam, subscribeParam, setSearchParams]);
  
  // Handle subscription after signup
  useEffect(() => {
    const handleSubscribeAfterSignup = async () => {
      // Check if user is logged in and we have the subscribeAfterSignup flag
      if (user && localStorage.getItem('subscribeAfterSignup') === 'true') {
        try {
          // Remove the flag
          localStorage.removeItem('subscribeAfterSignup');
          
          // Import the redirectToStripeCheckout function
          const { redirectToStripeCheckout } = await import('@/lib/utils');
          
          // Redirect to Stripe Checkout
          await redirectToStripeCheckout(user.id, 'subscription');
        } catch (error) {
          console.error('Error redirecting to Stripe Checkout after signup:', error);
          toast({
            title: "Error",
            description: "Failed to redirect to checkout. Please try again.",
            variant: "destructive",
          });
        }
      }
    };
    
    handleSubscribeAfterSignup();
  }, [user, toast]);
  
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      // Only handle payment status if it exists
      if (!paymentStatus) return;
      
      console.log("Index: Processing payment status:", paymentStatus);
      console.log("Index: Current localStorage items:", {
        returnTo: localStorage.getItem('returnTo'),
        shouldDownload: localStorage.getItem('shouldDownload'),
        enhancedDataSessionId: localStorage.getItem('enhancedDataSessionId'),
        enhancedDataId: localStorage.getItem('enhancedDataId')
      });
      
      try {
        if (paymentStatus === "success" && user) {
          console.log("Index: Payment successful for user:", user.id);
          
          // Create or update user subscription status
          const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: user.id,
              subscription_status: 'active',
              subscription_type: 'subscription',
            }, { onConflict: 'user_id' });
          
          if (error) {
            console.error("Index: Error updating subscription status:", error);
            console.error("Index: Error details:", JSON.stringify(error));
            toast({
              title: "Payment successful",
              description: "But we couldn't update your account. Please contact support.",
              variant: "destructive",
            });
          } else {
            console.log("Index: Successfully updated subscription status");
            
            // Force refresh the subscription status
            await checkSubscriptionStatus();
            
            // Associate enhanced data with user if available
            const enhancedDataSessionId = localStorage.getItem('enhancedDataSessionId');
            if (enhancedDataSessionId) {
              try {
                await associateEnhancedDataWithUser(user.id, enhancedDataSessionId);
                console.log("Index: Associated enhanced data with user");
              } catch (error) {
                console.error("Index: Error associating enhanced data with user:", error);
              }
            }
            
            toast({
              title: "Payment successful!",
              description: "Thank you for your purchase. You can now download CSV files anytime.",
            });
            
            // Get the return URL from localStorage
            const returnTo = localStorage.getItem('returnTo');
            console.log("Index: Return URL from localStorage:", returnTo);
            
            // Check if we should trigger a download after payment
            const shouldDownload = localStorage.getItem('shouldDownload') === 'true';
            console.log("Index: Should download after payment:", shouldDownload);
            
            // Always set the downloadAfterPayment flag in sessionStorage
            // This ensures it will be checked even if we stay on the same page
            if (shouldDownload) {
              console.log("Index: Setting downloadAfterPayment flag in sessionStorage");
              sessionStorage.setItem('downloadAfterPayment', 'true');
            }
            
            if (returnTo && returnTo !== window.location.pathname) {
              console.log(`Index: Navigating to return URL: ${returnTo}`);
              
              // Clear the localStorage flags
              localStorage.removeItem('returnTo');
              localStorage.removeItem('shouldDownload');
              
              navigate(returnTo);
            } else {
              console.log("Index: No valid return URL found or already on the correct page");
              localStorage.removeItem('returnTo');
              localStorage.removeItem('shouldDownload');
              
              // If we're already on the correct page, manually trigger the download check
              if (shouldDownload) {
                console.log("Index: Manually triggering download check");
                // Wait a moment for subscription status to update
                setTimeout(() => {
                  // Dispatch a custom event to notify components that they should check for downloads
                  window.dispatchEvent(new CustomEvent('checkDownloadAfterPayment'));
                }, 1000);
              }
            }
          }
        } else if (paymentStatus === "cancel") {
          console.log("Index: Payment was cancelled");
          toast({
            title: "Payment cancelled",
            description: "Your payment was cancelled. No charges were made.",
          });
          // Clear stored URL on cancel
          localStorage.removeItem('returnTo');
          localStorage.removeItem('shouldDownload');
          console.log("Index: Cleared localStorage items after cancel");
        }

        // Clear the payment_status from URL to prevent multiple toasts
        setSearchParams(prev => {
          prev.delete("payment_status");
          return prev;
        });
        console.log("Index: Cleared payment_status from URL");
      } catch (error) {
        console.error("Index: Error in payment success handler:", error);
      }
    };
    
    handlePaymentSuccess();
  }, [paymentStatus, user, navigate, setSearchParams, toast, checkSubscriptionStatus]);

  // Reference to the MetaEnhancer component
  const metaEnhancerRef = React.useRef<{ handlePendingFileUpload: (file: File) => void } | null>(null);

  // Check for pending file upload from landing page
  useEffect(() => {
    const checkPendingFileUpload = async () => {
      const pendingFileName = sessionStorage.getItem('pendingUploadFile');
      const pendingFileUrl = sessionStorage.getItem('pendingUploadFileUrl');
      
      if (pendingFileName && pendingFileUrl) {
        try {
          console.log("Index: Found pending file upload:", pendingFileName);
          
          // Fetch the file from the URL
          const response = await fetch(pendingFileUrl);
          const blob = await response.blob();
          
          // Create a new File object
          const file = new File([blob], pendingFileName, { type: 'text/csv' });
          
          // Clear the pending upload data
          sessionStorage.removeItem('pendingUploadFile');
          sessionStorage.removeItem('pendingUploadFileUrl');
          
          // Pass the file to the MetaEnhancer component
          if (metaEnhancerRef.current) {
            metaEnhancerRef.current.handlePendingFileUpload(file);
          }
        } catch (error) {
          console.error("Index: Error processing pending file upload:", error);
          toast({
            title: "Error processing file",
            description: "An error occurred while processing your uploaded file.",
            variant: "destructive",
          });
        }
      }
    };
    
    // Short delay to ensure MetaEnhancer is mounted
    const timer = setTimeout(() => {
      checkPendingFileUpload();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [toast]);

  // Listen for custom events to open the auth modal
  useEffect(() => {
    const handleOpenAuthModal = (event: CustomEvent) => {
      const { view } = event.detail;
      setAuthModalView(view === 'login' ? 'signin' : 'signup');
      setShowAuthModal(true);
    };

    // Add event listener
    window.addEventListener('openAuthModal', handleOpenAuthModal as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('openAuthModal', handleOpenAuthModal as EventListener);
    };
  }, []);

  return (
    <BrandLayout 
      showAuthModal={showAuthModal} 
      setShowAuthModal={setShowAuthModal}
      authModalView={authModalView === 'signin' ? 'login' : 'signup'}
      setAuthModalView={(view) => setAuthModalView(view === 'login' ? 'signin' : 'signup')}
    >
      <div className="fixed inset-0 bg-neutral-50 flex items-center justify-center overflow-hidden">
        <main className="container mx-auto px-2 md:px-4 h-full flex flex-col justify-center pt-16 pb-16 w-full max-w-4xl">
          <div className="overflow-auto max-h-full w-full">
            <div 
              className="bg-gradient-to-br from-white to-[#F9F0E6] p-4 md:p-8 lg:p-12 rounded-xl text-center"
              style={{ 
                backgroundImage: 'linear-gradient(to bottom right, #FFFFFF, #F9F0E6)'
              }}
            >
              <Hero />
              <MetaEnhancer ref={metaEnhancerRef} />
            </div>
          </div>
        </main>
      </div>
    </BrandLayout>
  );
};

export default Index;
