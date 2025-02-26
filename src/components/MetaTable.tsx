
import React, { useState, useEffect, useMemo } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton, InputSkeleton, TextSkeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MetaData } from "@/lib/types";

interface MetaTableProps {
  data: (MetaData & { isLoading?: boolean })[];
  onDataChange?: (updatedData: MetaData[]) => void;
}

const MetaTable = ({ data, onDataChange }: MetaTableProps) => {
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [editableData, setEditableData] = useState<(MetaData & { isLoading?: boolean })[]>([]);
  
  useEffect(() => {
    setEditableData([...data]);
  }, [data]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedItems({});
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [copiedItems]);

  // Function to check if a field was completely AI-generated - DEFINED BEFORE USE
  const wasGenerated = (original: string, enhanced: string): boolean => {
    return !original || original.trim() === '';
  };

  // Function to check if a field was rewritten by AI - DEFINED BEFORE USE
  const wasRewritten = (original: string, enhanced: string): boolean => {
    return original && original.trim() !== '' && 
           enhanced && enhanced.trim() !== '' && 
           original.trim() !== enhanced.trim();
  };

  // Find up to 3 featured items that have AI-generated content
  const featuredItems = useMemo(() => {
    // Get items with AI-generated content that are ready (not loading)
    const aiItems = editableData
      .filter(item => !item.isLoading && (
        wasGenerated(item.original_title, item.enhanced_title) || 
        wasGenerated(item.original_description, item.enhanced_description) ||
        wasRewritten(item.original_title, item.enhanced_title) ||
        wasRewritten(item.original_description, item.enhanced_description)
      ))
      .slice(0, 3); // Take up to 3 items
    
    return aiItems;
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
    item: MetaData & { isLoading?: boolean },
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

  // Render a table row for a meta item
  const renderMetaTableRow = (item: MetaData & { isLoading?: boolean }, index: number, isFeatured: boolean = false) => {
    const itemKey = isFeatured ? `featured-${index}` : `row-${index}`;
    const keyPrefix = isFeatured ? 'featured' : 'regular';
    
    return (
      <TableRow key={itemKey} className={isFeatured ? "bg-blue-50/30" : ""}>
        <TableCell className="align-top py-4 w-[450px] max-w-[450px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Badge 
                  variant="outline" 
                  className="text-xs font-normal bg-muted/30 border-border"
                >
                  {item.enhanced_title.length} / 60 chars
                </Badge>
                {wasGenerated(item.original_title, item.enhanced_title) && (
                  <Badge className="text-xs font-normal bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>AI-Generated</span>
                  </Badge>
                )}
                {wasRewritten(item.original_title, item.enhanced_title) && (
                  <Badge className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>AI-Rewritten</span>
                  </Badge>
                )}
                {isFeatured && (
                  <Badge className="text-xs font-normal bg-amber-50 text-amber-700 border-amber-200">
                    Featured Example
                  </Badge>
                )}
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(item.enhanced_title, `title-${keyPrefix}`, index)}
                      disabled={item.isLoading}
                    >
                      {copiedItems[`title-${keyPrefix}-${index}`] ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Copy title</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Original title (greyed out) */}
            {item.original_title ? (
              <p className="text-xs text-muted-foreground break-words">
                Original: {item.original_title}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No original title provided
              </p>
            )}

            {/* Enhanced title input */}
            {item.isLoading ? (
              <InputSkeleton className="h-10" />
            ) : (
              <Input
                value={item.enhanced_title}
                onChange={(e) => handleTextChange(item, 'enhanced_title', e.target.value)}
                onBlur={() => {
                  if (onDataChange) {
                    const cleanData = editableData.map(({ isLoading, ...rest }) => rest);
                    onDataChange(cleanData);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full border-muted"
                maxLength={60}
                placeholder="Enter enhanced title"
              />
            )}
          </div>
        </TableCell>
        
        <TableCell className="align-top py-4 w-[550px] max-w-[550px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Badge 
                  variant="outline" 
                  className="text-xs font-normal bg-muted/30 border-border"
                >
                  {item.enhanced_description.length} / 160 chars
                </Badge>
                {wasGenerated(item.original_description, item.enhanced_description) && (
                  <Badge className="text-xs font-normal bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>AI-Generated</span>
                  </Badge>
                )}
                {wasRewritten(item.original_description, item.enhanced_description) && (
                  <Badge className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>AI-Rewritten</span>
                  </Badge>
                )}
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(item.enhanced_description, `desc-${keyPrefix}`, index)}
                      disabled={item.isLoading}
                    >
                      {copiedItems[`desc-${keyPrefix}-${index}`] ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Copy description</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Original description (greyed out) */}
            {item.original_description ? (
              <p className="text-xs text-muted-foreground break-words">
                Original: {item.original_description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No original description provided
              </p>
            )}

            {/* Enhanced description input */}
            {item.isLoading ? (
              <InputSkeleton className="h-20" />
            ) : (
              <Textarea
                value={item.enhanced_description}
                onChange={(e) => handleTextChange(item, 'enhanced_description', e.target.value)}
                onBlur={() => {
                  if (onDataChange) {
                    const cleanData = editableData.map(({ isLoading, ...rest }) => rest);
                    onDataChange(cleanData);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="w-full border-muted"
                maxLength={160}
                rows={3}
                placeholder="Enter enhanced description"
              />
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (data.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-white">
        <p className="text-neutral-500">No data available.</p>
      </div>
    );
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
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-neutral-100">
            <TableRow>
              <TableHead className="w-[450px] max-w-[450px]">Meta Title</TableHead>
              <TableHead className="w-[550px] max-w-[550px]">Meta Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Featured AI Examples Section */}
            {featuredItems.length > 0 && (
              <>
                {featuredItems.map((item, index) => 
                  renderMetaTableRow(item, index, true)
                )}
                {/* Separator row */}
                <TableRow>
                  <TableCell colSpan={2} className="py-2 px-4 bg-neutral-100">
                    <div className="text-sm font-medium text-neutral-500">All Entries</div>
                  </TableCell>
                </TableRow>
              </>
            )}
            
            {/* All Other Entries (Original Order) */}
            {remainingItems.map((item, index) => 
              renderMetaTableRow(item, index, false)
            )}
            
            {/* If all items are loading, show a helpful message */}
            {remainingItems.length === 0 && editableData.every(item => item.isLoading) && (
              <TableRow>
                <TableCell colSpan={2} className="py-4 text-center">
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-500">AI is enhancing your meta data...</p>
                    <div className="max-w-lg mx-auto space-y-2">
                      <TextSkeleton lines={1} />
                      <TextSkeleton lines={2} />
                    </div>
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
