import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";

interface ColumnSelectorProps {
  headers: string[];
  titleColumnIndex: number;
  descriptionColumnIndex: number;
  onTitleColumnChange: (index: number) => void;
  onDescriptionColumnChange: (index: number) => void;
}

const ColumnSelector = ({
  headers,
  titleColumnIndex,
  descriptionColumnIndex,
  onTitleColumnChange,
  onDescriptionColumnChange
}: ColumnSelectorProps) => {
  const isMobile = useIsMobile();
  
  return (
    <motion.div 
      className="mt-3 md:mt-6 space-y-2 md:space-y-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-xs md:text-sm font-medium text-neutral-700">Column Selection</h3>
      
      {(titleColumnIndex === -1 || descriptionColumnIndex === -1) && (
        <Alert variant="default" className="bg-amber-50 border-amber-200 p-2 md:p-4">
          <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 text-xs md:text-sm font-medium">Column detection uncertain</AlertTitle>
          <AlertDescription className="text-amber-700 text-xs">
            Please select which columns contain the meta title and description.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
        <div>
          <label className="text-xs text-neutral-500 mb-1 md:mb-1.5 block">
            Meta Title Column
          </label>
          <Select 
            value={titleColumnIndex.toString()} 
            onValueChange={(value) => onTitleColumnChange(parseInt(value))}
          >
            <SelectTrigger className="w-full text-xs md:text-sm h-8 md:h-10">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header, index) => (
                <SelectItem key={index} value={index.toString()} className="text-xs md:text-sm">
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-xs text-neutral-500 mb-1 md:mb-1.5 block">
            Meta Description Column
          </label>
          <Select 
            value={descriptionColumnIndex.toString()} 
            onValueChange={(value) => onDescriptionColumnChange(parseInt(value))}
          >
            <SelectTrigger className="w-full text-xs md:text-sm h-8 md:h-10">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header, index) => (
                <SelectItem key={index} value={index.toString()} className="text-xs md:text-sm">
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
};

export default ColumnSelector;
