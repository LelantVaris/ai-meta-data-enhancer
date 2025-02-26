
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Upload, Download, Check, AlertTriangle } from "lucide-react";
import MetaTable from "./MetaTable";
import FileUpload from "./FileUpload";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { enhanceMeta, detectMetaColumns } from "@/lib/meta-enhancer";
import { MetaData, ColumnDetectionResult } from "@/lib/types";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MetaEnhancer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [enhancedData, setEnhancedData] = useState<MetaData[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [columnDetection, setColumnDetection] = useState<ColumnDetectionResult | null>(null);
  const [titleColumnIndex, setTitleColumnIndex] = useState<number>(-1);
  const [descriptionColumnIndex, setDescriptionColumnIndex] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleFileChange = (file: File | null) => {
    setFile(file);
    setEnhancedData(null);
    setIsSuccess(false);
    setColumnDetection(null);
    setTitleColumnIndex(-1);
    setDescriptionColumnIndex(-1);
    
    if (file) {
      detectColumns(file);
    }
  };

  const detectColumns = async (file: File) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim() !== '');
          
          if (lines.length < 1) {
            throw new Error("CSV file appears to be empty or invalid");
          }

          // Parse headers and detect column indices
          const headers = lines[0].split(',').map(header => header.trim());
          const detection = detectMetaColumns(headers);
          
          setColumnDetection(detection);
          setTitleColumnIndex(detection.titleColumnIndex);
          setDescriptionColumnIndex(detection.descriptionColumnIndex);
          
          if (detection.titleColumnIndex === -1 || detection.descriptionColumnIndex === -1) {
            toast({
              title: "Column detection uncertain",
              description: "Please manually select the title and description columns.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Columns auto-detected",
              description: `Found meta title in "${headers[detection.titleColumnIndex]}" and meta description in "${headers[detection.descriptionColumnIndex]}"`,
            });
          }
        } catch (error) {
          toast({
            title: "Error analyzing file",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive",
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Error reading file",
          description: "Could not read the uploaded CSV file",
          variant: "destructive",
        });
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Error detecting columns:", error);
    }
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

    if (titleColumnIndex === -1 || descriptionColumnIndex === -1) {
      toast({
        title: "Columns not selected",
        description: "Please select both title and description columns.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const data = await parseFile(file, titleColumnIndex, descriptionColumnIndex);
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

  const parseFile = (file: File, titleIdx: number, descIdx: number): Promise<MetaData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim() !== '');
          
          if (lines.length < 2) {
            throw new Error("CSV file appears to be empty or invalid");
          }

          // Skip header row, start from index 1
          const results: MetaData[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            // Handle CSV parsing with respect to quoted values
            const values = parseCSVLine(lines[i]);
            
            if (values.length > Math.max(titleIdx, descIdx)) {
              results.push({
                original_title: values[titleIdx] || '',
                original_description: values[descIdx] || '',
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

  // Function to properly parse CSV with respect to quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let inQuote = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Handle escaped quotes (two double quotes together inside a quoted string)
        if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
          currentValue += '"';
          i++; // Skip the next quote
        } else {
          // Toggle quote state
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        // End of value
        result.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    result.push(currentValue.trim());
    
    return result;
  };

  const handleDownload = () => {
    if (!enhancedData) return;
    
    const headers = columnDetection?.headers || ["meta_title", "meta_description"];
    const headerRow = headers.join(',');
    
    // Prepare CSV rows based on original data but replace the title and description columns
    const csvContent = enhancedData.map(item => {
      // Create a new array with all original columns (represented by empty strings as placeholders)
      const row = new Array(headers.length).fill('');
      
      // Replace the title and description columns with enhanced versions
      row[titleColumnIndex] = `"${item.enhanced_title.replace(/"/g, '""')}"`;
      row[descriptionColumnIndex] = `"${item.enhanced_description.replace(/"/g, '""')}"`;
      
      return row.join(',');
    }).join("\n");
    
    const blob = new Blob([headerRow + '\n' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
                
                {columnDetection && (
                  <motion.div 
                    className="mt-6 space-y-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-sm font-medium text-neutral-700">Column Selection</h3>
                    
                    {(titleColumnIndex === -1 || descriptionColumnIndex === -1) && (
                      <Alert variant="default" className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 text-sm font-medium">Column detection uncertain</AlertTitle>
                        <AlertDescription className="text-amber-700 text-xs">
                          Please select which columns contain the meta title and description.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block">
                          Meta Title Column
                        </label>
                        <Select 
                          value={titleColumnIndex.toString()} 
                          onValueChange={(value) => setTitleColumnIndex(parseInt(value))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {columnDetection.headers.map((header, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block">
                          Meta Description Column
                        </label>
                        <Select 
                          value={descriptionColumnIndex.toString()} 
                          onValueChange={(value) => setDescriptionColumnIndex(parseInt(value))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {columnDetection.headers.map((header, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div className="mt-6">
                  <Button
                    onClick={handleEnhance}
                    disabled={!file || isProcessing || titleColumnIndex === -1 || descriptionColumnIndex === -1}
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
                    setColumnDetection(null);
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
