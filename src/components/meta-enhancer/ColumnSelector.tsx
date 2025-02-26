
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
  return (
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
            onValueChange={(value) => onTitleColumnChange(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header, index) => (
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
            onValueChange={(value) => onDescriptionColumnChange(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header, index) => (
                <SelectItem key={index} value={index.toString()}>
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
