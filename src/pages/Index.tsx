import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import MetaEnhancer from "@/components/MetaEnhancer";
import Hero from "@/components/Hero";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BrandLayout from "@/components/layout/BrandLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import React from "react";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
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

  return (
    <BrandLayout>
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
