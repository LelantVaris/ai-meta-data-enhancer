
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { enhanceMeta, detectMetaColumns } from "@/lib/meta-enhancer";
import { MetaData, ColumnDetectionResult } from "@/lib/types";
import { parseCSVLine } from "@/utils/csv-parser";

export const useMetaEnhancerLogic = () => {
  const [file, setFile] = useState<File | null>(null);
  const [enhancedData, setEnhancedData] = useState<MetaData[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [columnDetection, setColumnDetection] = useState<ColumnDetectionResult | null>(null);
  const [titleColumnIndex, setTitleColumnIndex] = useState<number>(-1);
  const [descriptionColumnIndex, setDescriptionColumnIndex] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const enhanced = await enhanceMeta(data);
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

  const resetAll = () => {
    setFile(null);
    setEnhancedData(null);
    setIsSuccess(false);
    setColumnDetection(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
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
    setTitleColumnIndex,
    setDescriptionColumnIndex,
    resetAll
  };
};
