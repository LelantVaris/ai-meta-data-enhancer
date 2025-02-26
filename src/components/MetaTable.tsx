
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MetaData } from "@/lib/types";

interface MetaTableProps {
  data: MetaData[];
}

const MetaTable = ({ data }: MetaTableProps) => {
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedItems({});
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [copiedItems]);

  const copyToClipboard = (text: string, type: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedItems({ ...copiedItems, [`${type}-${index}`]: true });
    
    toast({
      title: "Copied to clipboard",
      description: "You can now paste this text wherever you need it.",
    });
  };

  const copyAllToClipboard = () => {
    const allText = data.map(item => 
      `Title: ${item.enhanced_title}\nDescription: ${item.enhanced_description}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(allText);
    
    toast({
      title: "All data copied to clipboard",
      description: `Copied ${data.length} entries to your clipboard.`,
    });
  };

  if (data.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-white">
        <p className="text-neutral-500">No data available.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden"
    >
      <div className="p-4 border-b border-neutral-100 flex justify-between items-center">
        <h3 className="font-medium text-neutral-800">Enhanced Meta Data</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyAllToClipboard}
          className="text-xs h-8 border-neutral-200 hover:bg-neutral-50"
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copy All
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] md:w-[300px]">Original Title</TableHead>
              <TableHead className="w-[180px] md:w-[300px]">Enhanced Title</TableHead>
              <TableHead className="w-[180px] md:w-[300px]">Original Description</TableHead>
              <TableHead>Enhanced Description</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="align-top py-4">
                  <div className="max-w-[180px] md:max-w-[300px] overflow-hidden">
                    <Badge variant="outline" className="mb-1 text-xs font-normal bg-neutral-50 border-neutral-200">
                      {item.original_title.length} chars
                    </Badge>
                    <p className="text-xs line-clamp-3 text-neutral-600">{item.original_title}</p>
                  </div>
                </TableCell>
                <TableCell className="align-top py-4">
                  <div className="max-w-[180px] md:max-w-[300px] overflow-hidden">
                    <Badge variant="outline" className="mb-1 text-xs font-normal bg-neutral-50 border-neutral-200">
                      {item.enhanced_title.length} chars
                    </Badge>
                    <p className="text-xs line-clamp-3 text-neutral-600">{item.enhanced_title}</p>
                  </div>
                </TableCell>
                <TableCell className="align-top py-4">
                  <div className="max-w-[180px] md:max-w-[300px] overflow-hidden">
                    <Badge variant="outline" className="mb-1 text-xs font-normal bg-neutral-50 border-neutral-200">
                      {item.original_description.length} chars
                    </Badge>
                    <p className="text-xs line-clamp-3 text-neutral-600">{item.original_description}</p>
                  </div>
                </TableCell>
                <TableCell className="align-top py-4">
                  <div className="max-w-[180px] md:max-w-[300px] overflow-hidden">
                    <Badge variant="outline" className="mb-1 text-xs font-normal bg-neutral-50 border-neutral-200">
                      {item.enhanced_description.length} chars
                    </Badge>
                    <p className="text-xs line-clamp-3 text-neutral-600">{item.enhanced_description}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right align-top py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(
                            `Title: ${item.enhanced_title}\nDescription: ${item.enhanced_description}`, 
                            'meta', 
                            index
                          )}
                        >
                          {copiedItems[`meta-${index}`] ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-neutral-500" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Copy both title and description</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default MetaTable;
