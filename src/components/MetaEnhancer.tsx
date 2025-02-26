
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import FileUpload from "./FileUpload";
import MetaTable from "./MetaTable";
import ColumnSelector from "./meta-enhancer/ColumnSelector";
import ResultsHeader from "./meta-enhancer/ResultsHeader";
import EnhanceButton from "./meta-enhancer/EnhanceButton";
import { useMetaEnhancerLogic } from "./meta-enhancer/MetaEnhancerLogic";

const MetaEnhancer = () => {
  const isMobile = useIsMobile();
  const {
    file,
    enhancedData,
    isProcessing,
    columnDetection,
    titleColumnIndex,
    descriptionColumnIndex,
    fileInputRef,
    handleFileChange,
    handleEnhance,
    handleDownload,
    setTitleColumnIndex,
    setDescriptionColumnIndex,
    resetAll
  } = useMetaEnhancerLogic();

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <AnimatePresence>
        {!enhancedData ? (
          <motion.div
            className="w-full max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-sm border border-neutral-200 bg-white">
              <CardContent className="p-6">
                <FileUpload 
                  file={file}
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
                
                {columnDetection && (
                  <ColumnSelector
                    columnDetection={columnDetection}
                    titleColumnIndex={titleColumnIndex}
                    descriptionColumnIndex={descriptionColumnIndex}
                    setTitleColumnIndex={setTitleColumnIndex}
                    setDescriptionColumnIndex={setDescriptionColumnIndex}
                  />
                )}
                
                <EnhanceButton 
                  isProcessing={isProcessing}
                  disabled={!file || isProcessing || titleColumnIndex === -1 || descriptionColumnIndex === -1}
                  onClick={handleEnhance}
                />
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ResultsHeader 
              dataLength={enhancedData.length}
              onReset={resetAll}
              onDownload={handleDownload}
            />
            
            <MetaTable data={enhancedData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MetaEnhancer;
