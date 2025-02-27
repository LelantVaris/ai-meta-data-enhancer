import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import MetaEnhancer from "@/components/MetaEnhancer";
import Hero from "@/components/Hero";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BrandLayout from "@/components/layout/BrandLayout";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check for payment status in URL
  const paymentStatus = searchParams.get("payment_status");
  
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      // Only handle payment status if it exists
      if (!paymentStatus) return;
      
      console.log("Index: Processing payment status:", paymentStatus);
      console.log("Index: Current localStorage items:", {
        returnTo: localStorage.getItem('returnTo'),
        shouldDownload: localStorage.getItem('shouldDownload')
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
              subscription_type: 'one_time',
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
            toast({
              title: "Payment successful!",
              description: "Thank you for your purchase. You can now download CSV files anytime.",
            });
            
            // Get the return URL from localStorage
            const returnTo = localStorage.getItem('returnTo');
            console.log("Index: Return URL from localStorage:", returnTo);
            
            if (returnTo && returnTo !== window.location.pathname) {
              console.log(`Index: Navigating to return URL: ${returnTo}`);
              navigate(returnTo);
            } else {
              console.log("Index: No valid return URL found");
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
  }, [paymentStatus, user, navigate, setSearchParams, toast]);

  return (
    <BrandLayout>
      <div className="fixed inset-0 bg-neutral-50 flex items-center justify-center overflow-hidden">
        <main className="container max-w-5xl mx-auto px-4 h-full flex flex-col justify-center pt-16 pb-16">
          <div className="overflow-auto max-h-full">
            <div 
              className="bg-gradient-to-br from-white to-[#F9F0E6] p-12 rounded-xl text-center"
              style={{ 
                backgroundImage: 'linear-gradient(to bottom right, #FFFFFF, #F9F0E6)',
                padding: '3rem' 
              }}
            >
              <Hero />
              <MetaEnhancer />
            </div>
          </div>
        </main>
      </div>
    </BrandLayout>
  );
};

export default Index;
