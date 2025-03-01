import { useState, useEffect, useRef } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { hasReachedMonthlyUsageLimit, getRemainingUses } from "@/lib/usage-limits";

const MetaEnhancer = () => {
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
    setShowUsageLimitDialog
  } = useMetaEnhancerLogic();
  
  // Use subscription status and loading state from AuthContext
  const { user, isPaidUser, subscriptionLoading, checkSubscriptionStatus } = useAuth();
  const [showPaywallDialog, setShowPaywallDialog] = useState(false);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const paywallTriggerRef = useRef<HTMLButtonElement>(null);
  
  // Check if user has reached their usage limit
  useEffect(() => {
    // Only check for non-paid users
    if (!isPaidUser) {
      const remainingUses = getRemainingUses();
      setHasReachedLimit(remainingUses <= 0);
    } else {
      setHasReachedLimit(false);
    }
  }, [isPaidUser]);
  
  const handlePaywallComplete = () => {
    setShowPaywallDialog(false);
    // Force check subscription status to update UI immediately
    checkSubscriptionStatus();
  };

  return (
    <div className="overflow-visible">
      {/* Remove the Usage Limit Banner */}
      {/* <UsageLimitBanner isPaidUser={isPaidUser} /> */}
      
      {/* Hidden PaywallDialog trigger */}
      <div style={{ display: 'none' }}>
        <PaywallDialog
          onDownload={handlePaywallComplete}
          trigger={
            <Button ref={paywallTriggerRef}>
              Open Paywall
            </Button>
          }
        />
      </div>
      
      {/* Usage Limit Paywall Dialog */}
      <UsageLimitPaywallDialog 
        open={showUsageLimitDialog} 
        onOpenChange={setShowUsageLimitDialog} 
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
                          className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs md:text-sm"
                        >
                          Get Unlimited Access for $4.99/month
                        </Button>
                      </div>
                    ) : (
                      <>
                        <FileUpload
                          onFileSelected={handleFileChange}
                          fileInputRef={fileInputRef}
                          accept=".csv"
                          maxSize={2}
                          onBeforeUpload={checkUploadEligibility}
                        />
                        {!isPaidUser && (
                          <div className="mt-2 md:mt-3 text-center text-xs md:text-sm text-neutral-500">
                            <p>Free tier: {getRemainingUses()} uses remaining this month</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 md:space-y-6">
                    <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg">
                      <div className="bg-blue-50 p-1 md:p-2 rounded-full">
                        <Upload className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-xs md:text-sm text-neutral-800">
                          {file.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={resetAll}
                        className="text-neutral-500 hover:text-neutral-700 text-xs"
                      >
                        Change
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

                    <div className="flex justify-end">
                      <EnhanceButton
                        onClick={handleEnhance}
                        isProcessing={isProcessing}
                        disabled={titleColumnIndex === -1 || descriptionColumnIndex === -1}
                      />
                    </div>
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
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-2 md:space-y-4 overflow-visible"
          >
            <ResultsHeader
              dataLength={enhancedData.length}
              onReset={resetAll}
              onDownload={handleDownload}
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
};

export default MetaEnhancer;
