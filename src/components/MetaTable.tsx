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

const MetaTable = ({ data, onDataChange }: MetaTableProps) => {
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [editableData, setEditableData] = useState(data);
  
  useEffect(() => {
    setEditableData([...data]);
  }, [data]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedItems({});
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [copiedItems]);

  // Find up to 3 featured items that have AI-generated content
  const featuredItems = useMemo(() => {
    return editableData
      .filter(item => !item.isLoading && (
        wasGenerated(item.original_title, item.enhanced_title) || 
        wasGenerated(item.original_description, item.enhanced_description) ||
        wasRewritten(item.original_title, item.enhanced_title) ||
        wasRewritten(item.original_description, item.enhanced_description)
      ))
      .slice(0, 3);
  }, [editableData]);

  // The remaining items in original order, excluding featured items
  const remainingItems = useMemo(() => {
    const featuredIds = new Set(featuredItems.map(item => 
      `${item.original_title}-${item.original_description}`
    ));
    
    return editableData.filter(item => 
      !featuredIds.has(`${item.original_title}-${item.original_description}`)
    );
  }, [editableData, featuredItems]);

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

  if (data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
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
      
      <div className="overflow-auto max-h-[60vh]">
        <Table>
          <TableHeader className="bg-neutral-100">
            <TableRow>
              <TableHead className="w-[450px] max-w-[450px]">Meta Title</TableHead>
              <TableHead className="w-[550px] max-w-[550px]">Meta Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featuredItems.length > 0 && (
              <>
                {featuredItems.map((item, index) => (
                  <TableRow key={`featured-${index}`} className="bg-blue-50/30">
                    <MetaItem
                      item={item}
                      index={index}
                      isFeatured={true}
                      onDataChange={handleTextChange}
                      copiedItems={copiedItems}
                      onCopy={copyToClipboard}
                    />
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="py-2 px-4 bg-neutral-100">
                    <div className="text-sm font-medium text-neutral-500">All Entries</div>
                  </TableCell>
                </TableRow>
              </>
            )}
            
            {remainingItems.map((item, index) => (
              <TableRow key={`row-${index}`}>
                <MetaItem
                  item={item}
                  index={index}
                  onDataChange={handleTextChange}
                  copiedItems={copiedItems}
                  onCopy={copyToClipboard}
                />
              </TableRow>
            ))}
            
            {remainingItems.length === 0 && editableData.every(item => item.isLoading) && (
              <TableRow>
                <TableCell colSpan={2} className="py-4 text-center">
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-500">AI is enhancing your meta data...</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MetaTable;
