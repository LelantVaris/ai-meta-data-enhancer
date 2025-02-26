
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Upload, Download, Check } from "lucide-react";
import MetaTable from "./MetaTable";
import FileUpload from "./FileUpload";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { enhanceMeta } from "@/lib/meta-enhancer";
import { MetaData } from "@/lib/types";

const MetaEnhancer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [enhancedData, setEnhancedData] = useState<MetaData[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleFileChange = (file: File | null) => {
    setFile(file);
    setEnhancedData(null);
    setIsSuccess(false);
  };

  const handleEnhance = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a CSV file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const data = await parseFile(file);
      const enhanced = enhanceMeta(data);
      setEnhancedData(enhanced);
      setIsSuccess(true);
      toast({
        title: "Enhancement complete",
        description: `Successfully enhanced ${enhanced.length} meta entries.`,
      });
    } catch (error) {
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const parseFile = (file: File): Promise<MetaData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim() !== '');
          
          if (lines.length < 2) {
            throw new Error("CSV file appears to be empty or invalid");
          }

          const headers = lines[0].split(',').map(header => header.trim());
          
          if (!headers.includes('meta_title') || !headers.includes('meta_description')) {
            throw new Error("CSV must include 'meta_title' and 'meta_description' columns");
          }

          const titleIndex = headers.indexOf('meta_title');
          const descIndex = headers.indexOf('meta_description');
          
          const results: MetaData[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            
            if (values.length >= Math.max(titleIndex, descIndex) + 1) {
              results.push({
                original_title: values[titleIndex],
                original_description: values[descIndex],
                enhanced_title: '',
                enhanced_description: ''
              });
            }
          }
          
          resolve(results);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };
      
      reader.readAsText(file);
    });
  };

  const handleDownload = () => {
    if (!enhancedData) return;
    
    const headers = "meta_title,meta_description\n";
    const csvContent = enhancedData.map(item => 
      `"${item.enhanced_title}","${item.enhanced_description}"`
    ).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'enhanced_meta.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: "Your enhanced meta data is being downloaded.",
    });
  };

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
                
                <div className="mt-6">
                  <Button
                    onClick={handleEnhance}
                    disabled={!file || isProcessing}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white transition-all"
                  >
                    {isProcessing ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        Enhance Meta Data
                      </span>
                    )}
                  </Button>
                </div>
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center"
              >
                <div className="bg-green-50 p-1.5 rounded-full mr-2">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-neutral-700">
                  Processed {enhancedData.length} entries
                </span>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3"
              >
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFile(null);
                    setEnhancedData(null);
                    setIsSuccess(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New File
                </Button>
                
                <Button 
                  onClick={handleDownload}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </motion.div>
            </div>
            
            <MetaTable data={enhancedData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MetaEnhancer;
