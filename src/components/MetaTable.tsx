
import React, { useState, useEffect } from "react";
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
    updatedData[index][field] = value;
    setEditableData(updatedData);
    
    if (onDataChange) {
      const cleanData = updatedData.map(({ isLoading, ...rest }) => rest);
      onDataChange(cleanData);
    }
  };

  // Function to check if a field was AI-inferred based on empty original content
  const wasInferred = (original: string): boolean => {
    return !original || original.trim() === '';
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
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Meta Title</TableHead>
              <TableHead className="w-[40%]">Meta Description</TableHead>
              <TableHead className="w-[20%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editableData.map((item, index) => (
              <TableRow key={`row-${index}`}>
                <TableCell className="align-top py-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs font-normal bg-muted/30 border-border"
                      >
                        {editableData[index].enhanced_title.length} / 60 chars
                      </Badge>
                      {wasInferred(item.original_title) && (
                        <Badge className="text-xs font-normal bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>AI-Generated</span>
                        </Badge>
                      )}
                    </div>
                    
                    {/* Original title (greyed out) */}
                    {item.original_title ? (
                      <p className="text-xs text-muted-foreground truncate max-w-full">
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
                        value={editableData[index].enhanced_title}
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
                
                <TableCell className="align-top py-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs font-normal bg-muted/30 border-border"
                      >
                        {editableData[index].enhanced_description.length} / 160 chars
                      </Badge>
                      {wasInferred(item.original_description) && (
                        <Badge className="text-xs font-normal bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>AI-Generated</span>
                        </Badge>
                      )}
                    </div>
                    
                    {/* Original description (greyed out) */}
                    {item.original_description ? (
                      <p className="text-xs text-muted-foreground truncate max-w-full">
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
                        value={editableData[index].enhanced_description}
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
                
                <TableCell className="text-right align-top py-4">
                  <div className="flex flex-col gap-2 items-end">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(editableData[index].enhanced_title, 'title', index)}
                            disabled={item.isLoading}
                          >
                            {copiedItems[`title-${index}`] ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Copy title</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(editableData[index].enhanced_description, 'desc', index)}
                            disabled={item.isLoading}
                          >
                            {copiedItems[`desc-${index}`] ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Copy description</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
