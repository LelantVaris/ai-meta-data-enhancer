import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { enhanceMetaStreaming, detectMetaColumns } from "@/lib/meta-enhancer";
import { MetaData, ColumnDetectionResult } from "@/lib/types";
import { parseCSVLine } from "@/utils/csv-parser";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  hasReachedMonthlyUsageLimit, 
  getMaxEntriesToProcess, 
  recordUsage,
  initializeUsageTracking,
  hasTooManyRows,
  UPLOAD_LIMITS
} from "@/lib/usage-limits";
import UsageLimitPaywallDialog from "@/components/UsageLimitPaywallDialog";

export const useMetaEnhancerLogic = () => {
  const [file, setFile] = useState<File | null>(null);
  const [enhancedData, setEnhancedData] = useState<MetaData[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAllProcessed, setIsAllProcessed] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [columnDetection, setColumnDetection] = useState<ColumnDetectionResult | null>(null);
  const [titleColumnIndex, setTitleColumnIndex] = useState<number>(-1);
  const [descriptionColumnIndex, setDescriptionColumnIndex] = useState<number>(-1);
  const [showUsageLimitDialog, setShowUsageLimitDialog] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [processedEntries, setProcessedEntries] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isPaidUser, checkSubscriptionStatus } = useAuth();
  
  // Initialize usage tracking when component mounts
  useEffect(() => {
    initializeUsageTracking();
  }, []);
  
  // Function to manually update the paid user status (if needed)
  const updateIsPaidUser = async (status: boolean) => {
    // If status is different from current status, force a subscription check
    if (status !== isPaidUser) {
      await checkSubscriptionStatus();
    }
  };

  // Check if user can upload based on their usage limits
  const checkUploadEligibility = (file: File): boolean => {
    // For logged-in paid users, always allow upload
    if (isPaidUser) {
      return true;
    }
    
    // Check if free user has reached monthly usage limit
    if (hasReachedMonthlyUsageLimit(false)) {
      // Show the usage limit dialog only when they try to upload
      setShowUsageLimitDialog(true);
      return false;
    }
    
    return true;
  };

  const handleFileChange = (file: File | null) => {
    // File upload eligibility is now checked in the FileUpload component
    // via the onBeforeUpload callback
    setFile(file);
    setEnhancedData(null);
    setIsSuccess(false);
    setIsAllProcessed(false);
    setColumnDetection(null);
    setTitleColumnIndex(-1);
    setDescriptionColumnIndex(-1);
    setProcessedEntries(0);
    setTotalEntries(0);
    
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
          
          // Check if file has too many rows (5000 row limit)
          if (lines.length - 1 > UPLOAD_LIMITS.MAX_ROWS_PER_FILE) { // -1 for header row
            toast({
              title: "File too large",
              description: `Your file exceeds the maximum allowed limit of ${UPLOAD_LIMITS.MAX_ROWS_PER_FILE} rows. Please upload a smaller file.`,
              variant: "destructive",
            });
            setFile(null);
            return;
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
    
    if (titleColumnIndex === -1 && descriptionColumnIndex === -1) {
      toast({
        title: "No columns selected",
        description: "Please select at least one column to enhance.",
        variant: "destructive",
      });
      return;
    }
    
    // For paid users, skip the usage limit checks for monthly usage
    if (!isPaidUser) {
      // Check if free user has reached monthly usage limit
      if (hasReachedMonthlyUsageLimit(false)) {
        toast({
          title: "Monthly limit reached",
          description: "You've reached your free monthly usage limit. Please upgrade for unlimited access.",
          variant: "destructive",
        });
        setShowUsageLimitDialog(true);
        return;
      }
    }

    // Check if file exceeds the absolute maximum rows for any user
    const text = await file.text();
    const lines = text.split('\n').length;
    
    if (lines > UPLOAD_LIMITS.MAX_ROWS_PER_FILE) {
      toast({
        title: "File too large",
        description: `Your file exceeds the maximum allowed limit of ${UPLOAD_LIMITS.MAX_ROWS_PER_FILE} rows. Please upload a smaller file.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setIsSuccess(true);
    setProcessedEntries(0);
    
    try {
      let data = await parseFile(file, titleColumnIndex, descriptionColumnIndex);
      
      // Enforce maximum entries limit based on user status
      const maxEntries = getMaxEntriesToProcess(isPaidUser);
      if (data.length > maxEntries) {
        toast({
          title: "Entry limit applied",
          description: `Processing first ${maxEntries} entries. Upgrade for higher limits.`,
        });
        data = data.slice(0, maxEntries);
      }
      
      // Set total entries to be processed
      setTotalEntries(data.length);
      
      // Initialize with empty placeholder data with loading status
      const initialData = data.map(item => ({
        ...item,
        enhanced_title: '',
        enhanced_description: '',
        isLoading: true
      }));
      
      setEnhancedData(initialData);
      
      // Stream enhancements
      enhanceMetaStreaming(
        data,
        (index, enhancedItem) => {
          // Update the data with the enhanced item
          setEnhancedData(prevData => {
            if (!prevData) return null;
            
            const newData = [...prevData];
            
            // Update the item with the new data
            newData[index] = {
              ...newData[index],
              ...enhancedItem,
              // If both title and description are provided, mark as not loading
              isLoading: !('enhanced_title' in enhancedItem && 'enhanced_description' in enhancedItem)
            };
            
            return newData;
          });
          
          // If this update contains both title and description, increment the processed count
          if ('enhanced_title' in enhancedItem && 'enhanced_description' in enhancedItem) {
            setProcessedEntries(prev => Math.min(data.length, prev + 1));
          }
        },
        () => {
          // When all processing is complete, ensure all items are marked as not loading
          setEnhancedData(prevData => {
            if (!prevData) return null;
            
            return prevData.map(item => ({
              ...item,
              isLoading: false
            }));
          });
          
          // Ensure processedEntries matches totalEntries when all processing is complete
          setProcessedEntries(data.length);
          setIsAllProcessed(true);
          setIsProcessing(false);
          
          // Record usage for free users
          if (!isPaidUser) {
            recordUsage();
          }
          
          toast({
            title: "Enhancement complete",
            description: `Successfully enhanced ${data.length} meta entries.`,
          });
        }
      );
    } catch (error) {
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setIsProcessing(false);
      setIsSuccess(false);
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

  const handleDownload = () => {
    if (!enhancedData || !columnDetection) return;
    
    const headers = columnDetection.headers;
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

  const handleDataChange = (updatedData: MetaData[]) => {
    setEnhancedData(updatedData);
  };

  const resetAll = () => {
    setFile(null);
    setEnhancedData(null);
    setIsSuccess(false);
    setIsAllProcessed(false);
    setColumnDetection(null);
    setTotalEntries(0);
    setProcessedEntries(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    file,
    fileInputRef,
    enhancedData,
    isProcessing,
    isAllProcessed,
    isSuccess,
    columnDetection,
    titleColumnIndex,
    descriptionColumnIndex,
    isPaidUser,
    updateIsPaidUser,
    handleFileChange,
    handleEnhance,
    handleDownload,
    handleDataChange,
    setTitleColumnIndex,
    setDescriptionColumnIndex,
    resetAll,
    totalEntries,
    processedEntries,
    checkUploadEligibility,
    showUsageLimitDialog,
    setShowUsageLimitDialog,
    hasReachedMonthlyUsageLimit
  };
};
