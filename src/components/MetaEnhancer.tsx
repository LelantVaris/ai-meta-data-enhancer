import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Upload, Loader2, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import FileUpload from "@/components/FileUpload";
import MetaTable from "@/components/MetaTable";
import { useMetaEnhancerLogic } from "@/components/meta-enhancer/MetaEnhancerLogic";
import ColumnSelector from "@/components/meta-enhancer/ColumnSelector";
import EnhanceButton from "@/components/meta-enhancer/EnhanceButton";
import ResultsHeader from "@/components/meta-enhancer/ResultsHeader";
import PaywallDialog from "@/components/PaywallDialog";
import UsageLimitPaywallDialog from "@/components/UsageLimitPaywallDialog";
import DownloadPromptDialog from "@/components/DownloadPromptDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { hasReachedMonthlyUsageLimit, getRemainingUses } from "@/lib/usage-limits";
import { redirectToStripeCheckout } from "@/lib/utils";
import { getEnhancedDataById, getEnhancedDataBySessionId } from "@/lib/enhanced-data";

// Define the ref type
interface MetaEnhancerRefType {
  handlePendingFileUpload: (file: File) => void;
}

const MetaEnhancer = forwardRef<MetaEnhancerRefType>((props, ref) => {
  const {
    file,
    enhancedData,
    isProcessing,
    isSuccess,
    columnDetection,
    titleColumnIndex,
    descriptionColumnIndex,
    fileInputRef,
    updateIsPaidUser,
    totalEntries,
    processedEntries,
    handleFileChange,
    handleEnhance,
    handleDownload,
    handleDataChange,
    setTitleColumnIndex,
    setDescriptionColumnIndex,
    resetAll,
    checkUploadEligibility,
    showUsageLimitDialog,
    setShowUsageLimitDialog,
    isAllProcessed,
    setEnhancedData,
    setColumnDetection,
    setIsAllProcessed
  } = useMetaEnhancerLogic();
  
  // Use subscription status and loading state from AuthContext
  const { user, isPaidUser, subscriptionLoading, checkSubscriptionStatus } = useAuth();
  const [showPaywallDialog, setShowPaywallDialog] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const paywallTriggerRef = useRef<HTMLButtonElement>(null);
  
  // Expose methods to the parent component via ref
  useImperativeHandle(ref, () => ({
    handlePendingFileUpload: (file: File) => {
      // Check if the file is eligible for upload
      if (checkUploadEligibility(file)) {
        // Process the file
        handleFileChange(file);
        
        // Automatically trigger enhancement if columns are detected
        setTimeout(() => {
          if (titleColumnIndex !== -1 || descriptionColumnIndex !== -1) {
            handleEnhance();
          }
        }, 1000); // Give time for column detection to complete
      }
    }
  }));

  // Check if user has reached their usage limit
  useEffect(() => {
    if (!subscriptionLoading) {
      const hasReached = hasReachedMonthlyUsageLimit(isPaidUser);
      setHasReachedLimit(hasReached);
    }
  }, [isPaidUser, subscriptionLoading]);
  
  // Show download prompt dialog for free users when processing is complete
  useEffect(() => {
    if (isAllProcessed && enhancedData && enhancedData.length > 0 && !isPaidUser && !showDownloadPrompt) {
      setShowDownloadPrompt(true);
    }
  }, [isAllProcessed, enhancedData, isPaidUser, showDownloadPrompt]);

  const handlePaywallComplete = () => {
    setShowPaywallDialog(false);
    // Force a subscription status check after payment
    checkSubscriptionStatus();
  };
  
  // Handle download with prompt for free users
  const handleDownloadWithPrompt = () => {
    if (!isPaidUser) {
      setShowDownloadPrompt(true);
    } else {
      handleDownload();
    }
  };
  
  // Handle subscription from download prompt
  const handleSubscribeFromPrompt = async () => {
    setShowDownloadPrompt(false);
    
    try {
      if (user) {
        // For logged-in users, redirect directly to Stripe Checkout
        await redirectToStripeCheckout(user.id, 'subscription');
      } else {
        // For non-logged-in users, store the intent to subscribe in localStorage
        // and trigger the auth modal in the parent component
        localStorage.setItem('subscribeAfterSignup', 'true');
        localStorage.setItem('shouldDownload', 'true');
        
        // Store the current URL to return to after payment
        localStorage.setItem('returnTo', window.location.pathname);
        
        // Emit a custom event that will be caught by the Index component
        const event = new CustomEvent('openAuthModal', { 
          detail: { view: 'signup' } 
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error redirecting to Stripe Checkout:', error);
      toast({
        title: "Error",
        description: "Failed to redirect to checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to check for automatic download after payment
  const checkDownloadAfterPayment = useCallback(async () => {
    const shouldDownload = sessionStorage.getItem('downloadAfterPayment') === 'true';
    
    console.log("MetaEnhancer: checkDownloadAfterPayment called", {
      shouldDownload,
      isPaidUser,
      subscriptionLoading,
      enhancedData: enhancedData ? enhancedData.length : 0,
      enhancedDataId: localStorage.getItem('enhancedDataId'),
      sessionId: localStorage.getItem('enhancedDataSessionId')
    });
    
    if (shouldDownload && isPaidUser) {
      console.log("MetaEnhancer: Triggering automatic download after payment");
      
      // Clear the flag
      sessionStorage.removeItem('downloadAfterPayment');
      
      // If we already have enhanced data, use it
      if (enhancedData && enhancedData.length > 0) {
        // Show success message
        toast({
          title: "Payment successful!",
          description: "Your file is being downloaded automatically.",
        });
        
        // Trigger the download
        handleDownload();
      } else {
        // Try to load enhanced data from Supabase
        try {
          // First try to get by ID
          const enhancedDataId = localStorage.getItem('enhancedDataId');
          let enhancedDataRecord = null;
          
          console.log("MetaEnhancer: Trying to load enhanced data", {
            enhancedDataId,
            sessionId: localStorage.getItem('enhancedDataSessionId')
          });
          
          if (enhancedDataId) {
            enhancedDataRecord = await getEnhancedDataById(enhancedDataId);
            console.log("MetaEnhancer: Data from ID lookup:", enhancedDataRecord);
          }
          
          // If not found by ID, try by session ID
          if (!enhancedDataRecord) {
            const sessionId = localStorage.getItem('enhancedDataSessionId');
            if (sessionId) {
              enhancedDataRecord = await getEnhancedDataBySessionId(sessionId);
              console.log("MetaEnhancer: Data from session ID lookup:", enhancedDataRecord);
            }
          }
          
          if (enhancedDataRecord) {
            console.log("MetaEnhancer: Found enhanced data in Supabase");
            
            // Set the enhanced data
            setEnhancedData(enhancedDataRecord.enhanced_data);
            setColumnDetection(enhancedDataRecord.column_detection);
            setTitleColumnIndex(enhancedDataRecord.title_column_index);
            setDescriptionColumnIndex(enhancedDataRecord.description_column_index);
            setIsAllProcessed(true);
            
            // Show success message
            toast({
              title: "Payment successful!",
              description: "Your file is being downloaded automatically.",
            });
            
            // Trigger the download after a short delay to ensure data is set
            setTimeout(() => {
              handleDownload();
            }, 500);
          } else {
            console.log("MetaEnhancer: No enhanced data found in Supabase");
            toast({
              title: "Payment successful!",
              description: "Your subscription is now active.",
            });
          }
        } catch (error) {
          console.error("Error loading enhanced data from Supabase:", error);
          toast({
            title: "Payment successful!",
            description: "Your subscription is now active.",
          });
        }
      }
    } else if (shouldDownload && (!isPaidUser || subscriptionLoading)) {
      // If we have the flag but the user is not recognized as paid yet,
      // check again in a moment (subscription status might still be updating)
      console.log("MetaEnhancer: Waiting for subscription status to update...");
      const timer = setTimeout(() => {
        checkSubscriptionStatus().then(() => {
          checkDownloadAfterPayment();
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [
    enhancedData, 
    handleDownload, 
    isPaidUser, 
    subscriptionLoading, 
    checkSubscriptionStatus, 
    setEnhancedData, 
    setColumnDetection, 
    setTitleColumnIndex, 
    setDescriptionColumnIndex, 
    setIsAllProcessed
  ]);

  // Listen for the checkDownloadAfterPayment event
  useEffect(() => {
    const handleCheckDownloadEvent = () => {
      console.log("MetaEnhancer: Received checkDownloadAfterPayment event");
      checkDownloadAfterPayment();
    };
    
    window.addEventListener('checkDownloadAfterPayment', handleCheckDownloadEvent);
    
    return () => {
      window.removeEventListener('checkDownloadAfterPayment', handleCheckDownloadEvent);
    };
  }, [checkDownloadAfterPayment]);

  // Check for automatic download after payment on initial render and when dependencies change
  useEffect(() => {
    // Check on initial render and when enhancedData or isPaidUser changes
    checkDownloadAfterPayment();
  }, [enhancedData, handleDownload, isPaidUser, subscriptionLoading, checkSubscriptionStatus, checkDownloadAfterPayment]);

  return (
    <div className="w-full">
      {/* Paywall Dialog */}
      <div className="hidden">
        <PaywallDialog 
          open={showPaywallDialog} 
          onOpenChange={setShowPaywallDialog} 
          onComplete={handlePaywallComplete}
          trigger={
            <Button ref={paywallTriggerRef}>
              Open Paywall
            </Button>
          }
          defaultPlan="subscription"
          skipPlanSelection={true}
          downloadAfterPayment={true}
          onDownloadAfterPayment={handleDownload}
        />
      </div>
      
      {/* Usage Limit Paywall Dialog */}
      <UsageLimitPaywallDialog 
        open={showUsageLimitDialog} 
        onOpenChange={setShowUsageLimitDialog} 
      />
      
      {/* Download Prompt Dialog for free users */}
      <DownloadPromptDialog
        open={showDownloadPrompt}
        onOpenChange={setShowDownloadPrompt}
        onDownload={handleDownload}
        onSubscribe={handleSubscribeFromPrompt}
      />
      
      <AnimatePresence mode="wait">
        {!isSuccess && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white border-neutral-200">
              <CardContent className="p-3 md:p-6">
                {!file ? (
                  <>
                    {!isPaidUser && hasReachedLimit ? (
                      <div className="border-2 border-dashed border-neutral-200 rounded-xl p-3 md:p-6 flex flex-col items-center justify-center text-center">
                        <div className="bg-amber-50 p-2 md:p-3 rounded-full mb-2 md:mb-3">
                          <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
                        </div>
                        <h3 className="text-sm md:text-base font-medium text-neutral-800 mb-1">
                          Monthly Usage Limit Reached
                        </h3>
                        <p className="text-xs md:text-sm text-neutral-500 mb-3 md:mb-4">
                          You've used all your free enhancements for this month
                        </p>
                        <Button
                          onClick={() => setShowUsageLimitDialog(true)}
                          variant="default"
                          size="sm"
                          className="text-xs md:text-sm"
                        >
                          Upgrade for Unlimited Access
                        </Button>
                      </div>
                    ) : (
                      <FileUpload
                        onFileSelected={handleFileChange}
                        fileInputRef={fileInputRef}
                        accept=".csv"
                        maxSize={5 * 1024 * 1024} // 5MB
                        onBeforeUpload={checkUploadEligibility}
                      />
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm md:text-base font-medium text-neutral-800">
                          {file.name}
                        </h3>
                        <p className="text-xs md:text-sm text-neutral-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          resetAll();
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                    
                    {columnDetection && (
                      <ColumnSelector
                        headers={columnDetection.headers}
                        titleColumnIndex={titleColumnIndex}
                        descriptionColumnIndex={descriptionColumnIndex}
                        onTitleColumnChange={setTitleColumnIndex}
                        onDescriptionColumnChange={setDescriptionColumnIndex}
                      />
                    )}
                    
                    <EnhanceButton
                      onClick={handleEnhance}
                      disabled={isProcessing || (titleColumnIndex === -1 && descriptionColumnIndex === -1)}
                      isProcessing={isProcessing}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isSuccess && enhancedData && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <ResultsHeader
              dataLength={enhancedData.length}
              onReset={resetAll}
              onDownload={handleDownloadWithPrompt}
              totalEntries={totalEntries}
              processedEntries={processedEntries}
              isProcessing={isProcessing}
            />
            
            <MetaTable
              data={enhancedData}
              onDataChange={handleDataChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MetaEnhancer.displayName = "MetaEnhancer";

export default MetaEnhancer;
