
import React, { useState, useEffect, useMemo } from "react";
import { Check, Copy, Sparkles, Edit, Save } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
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

  // Sort data to prioritize items with AI content at the top
  const sortedData = useMemo(() => {
    return [...editableData].sort((a, b) => {
      const aHasAI = wasGenerated(a.original_title, a.enhanced_title) || 
                   wasGenerated(a.original_description, a.enhanced_description);
      const bHasAI = wasGenerated(b.original_title, b.enhanced_title) || 
                   wasGenerated(b.original_description, b.enhanced_description);
      
      if (aHasAI && !bHasAI) return -1;
      if (!aHasAI && bHasAI) return 1;
      return 0;
    });
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
    index: number, 
    field: 'enhanced_title' | 'enhanced_description', 
    value: string
  ) => {
    const updatedData = [...editableData];
    const dataIndex = updatedData.findIndex(
      item => item === sortedData[index]
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

  // Function to check if a field was completely AI-generated
  const wasGenerated = (original: string, enhanced: string): boolean => {
    return !original || original.trim() === '';
  };

  // Function to check if a field was rewritten by AI (had original content but was modified)
  const wasRewritten = (original: string, enhanced: string): boolean => {
    return original && original.trim() !== '' && 
           enhanced && enhanced.trim() !== '' && 
           original.trim() !== enhanced.trim();
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
            {sortedData.map((item, index) => (
              <TableRow key={`row-${index}`}>
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
                      </div>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(item.enhanced_title, 'title', index)}
                              disabled={item.isLoading}
                            >
                              {copiedItems[`title-${index}`] ? (
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
                      <Skeleton className="w-full h-10" />
                    ) : (
                      <Input
                        value={item.enhanced_title}
                        onChange={(e) => handleTextChange(index, 'enhanced_title', e.target.value)}
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
                              onClick={() => copyToClipboard(item.enhanced_description, 'desc', index)}
                              disabled={item.isLoading}
                            >
                              {copiedItems[`desc-${index}`] ? (
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
                      <Skeleton className="w-full h-20" />
                    ) : (
                      <Textarea
                        value={item.enhanced_description}
                        onChange={(e) => handleTextChange(index, 'enhanced_description', e.target.value)}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MetaTable;
