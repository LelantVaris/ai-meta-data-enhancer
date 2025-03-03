import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
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
    isAllProcessed
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
  const handleSubscribeFromPrompt = () => {
    setShowDownloadPrompt(false);
    setShowPaywallDialog(true);
  };

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
