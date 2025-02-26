
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Upload, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import FileUpload from "@/components/FileUpload";
import MetaTable from "@/components/MetaTable";
import { useMetaEnhancerLogic } from "@/components/meta-enhancer/MetaEnhancerLogic";
import ColumnSelector from "@/components/meta-enhancer/ColumnSelector";
import EnhanceButton from "@/components/meta-enhancer/EnhanceButton";
import ResultsHeader from "@/components/meta-enhancer/ResultsHeader";

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
    handleFileChange,
    handleEnhance,
    handleDownload,
    handleDataChange,
    setTitleColumnIndex,
    setDescriptionColumnIndex,
    resetAll
  } = useMetaEnhancerLogic();

  return (
    <div className="mt-12">
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
              <CardContent className="p-6">
                {!file ? (
                  <FileUpload
                    onFileSelected={handleFileChange}
                    fileInputRef={fileInputRef}
                    accept=".csv"
                    maxSize={2}
                  />
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-1.5 rounded-full">
                        <Upload className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-neutral-800">
                          {file.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
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
            className="space-y-4"
          >
            <ResultsHeader
              dataLength={enhancedData.length}
              onReset={resetAll}
              onDownload={handleDownload}
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
