
import { motion } from "framer-motion";
import { Check, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultsHeaderProps {
  dataLength: number;
  onReset: () => void;
  onDownload: () => void;
}

const ResultsHeader = ({ dataLength, onReset, onDownload }: ResultsHeaderProps) => {
  return (
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
          Processed {dataLength} entries
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
          onClick={onReset}
          className="border-neutral-200 hover:bg-neutral-50 text-neutral-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload New File
        </Button>
        
        <Button 
          onClick={onDownload}
          className="bg-neutral-900 hover:bg-neutral-800 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </motion.div>
    </div>
  );
};

export default ResultsHeader;
