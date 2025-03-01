import { useState, useEffect, useMemo } from "react";
import { Copy } from "lucide-react";
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
import { MetaTableProps } from "./meta-table/MetaTableTypes";
import { MetaItem } from "./meta-table/MetaItem";
import { EmptyState } from "./meta-table/EmptyState";
import { wasGenerated, wasRewritten } from "./meta-table/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const MetaTable = ({ data, onDataChange }: MetaTableProps) => {
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [editableData, setEditableData] = useState(data);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    setEditableData([...data]);
  }, [data]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedItems({});
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [copiedItems]);

  // Previously this function filtered for "featured" items, now we'll treat all items equally
  const allItems = useMemo(() => {
    return editableData;
  }, [editableData]);

  const copyToClipboard = (text: string, type: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedItems({ ...copiedItems, [`${type}-${index}`]: true });
    
    toast({
      title: "Copied to clipboard",
      description: "You can now paste this text wherever you need it.",
    });
  };

  const copyAllToClipboard = () => {
    const allText = editableData.map(item => 
      `Title: ${item.enhanced_title}\nDescription: ${item.enhanced_description}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(allText);
    
    toast({
      title: "All data copied to clipboard",
      description: `Copied ${editableData.length} entries to your clipboard.`,
    });
  };

  const handleTextChange = (
    item: typeof editableData[0],
    field: 'enhanced_title' | 'enhanced_description', 
    value: string
  ) => {
    const updatedData = [...editableData];
    const dataIndex = updatedData.findIndex(
      dataItem => 
        dataItem.original_title === item.original_title && 
        dataItem.original_description === item.original_description
    );
    
    if (dataIndex !== -1) {
      updatedData[dataIndex][field] = value;
      setEditableData(updatedData);
      
      if (onDataChange) {
        const cleanData = updatedData.map(({ isLoading, ...rest }) => rest);
        onDataChange(cleanData);
      }
    }
  };

  return (
    <div>
      {editableData.length > 0 ? (
        <>
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={copyAllToClipboard}
              className="text-xs md:text-sm"
              size={isMobile ? "sm" : "default"}
            >
              <Copy className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              Copy All
            </Button>
          </div>
          <div className={`rounded-md border ${isMobile ? 'overflow-x-auto' : ''}`}>
            <Table className={isMobile ? 'w-[800px]' : 'w-full'}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Title</TableHead>
                  <TableHead className="w-1/2">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item, index) => (
                  <TableRow key={`${item.original_title}-${item.original_description}-${index}`}>
                    <MetaItem
                      item={item}
                      index={index}
                      isFeatured={false}
                      onDataChange={handleTextChange}
                      copiedItems={copiedItems}
                      onCopy={copyToClipboard}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
};

export default MetaTable;
