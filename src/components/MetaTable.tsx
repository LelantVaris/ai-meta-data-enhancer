
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    setEditableData([...data]);
    // Reset editing states when data changes
    setEditing({});
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

  const handleEdit = (index: number, field: 'enhanced_title' | 'enhanced_description') => {
    setEditing({...editing, [`${field}-${index}`]: true});
  };

  const handleSave = (index: number, field: 'enhanced_title' | 'enhanced_description') => {
    setEditing({...editing, [`${field}-${index}`]: false});
    
    if (onDataChange) {
      const cleanData = editableData.map(({ isLoading, ...rest }) => rest);
      onDataChange(cleanData);
    }

    toast({
      title: "Changes saved",
      description: "Your edits have been saved and will be included in the download.",
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
    <div
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
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="w-[40%]">Original Content</TableHead>
              <TableHead className="w-[40%]">Enhanced Content</TableHead>
              <TableHead className="w-[20%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editableData.map((item, index) => (
              <React.Fragment key={`fragment-${index}`}>
                {/* Title Row */}
                <TableRow key={`title-${index}`} className="border-b border-neutral-100">
                  <TableCell className="align-top py-4">
                    <div>
                      <Badge variant="outline" className="mb-1 text-xs font-normal bg-neutral-50 border-neutral-200">
                        Title • {item.original_title.length} chars
                      </Badge>
                      {item.original_title ? (
                        <p className="text-sm text-neutral-600">{item.original_title}</p>
                      ) : (
                        <p className="text-sm text-neutral-400 italic">No original title provided</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs font-normal bg-neutral-50 border-neutral-200"
                        >
                          {editableData[index].enhanced_title.length} chars
                        </Badge>
                        {wasInferred(item.original_title) && (
                          <Badge className="text-xs font-normal bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            <span>AI-Generated</span>
                          </Badge>
                        )}
                      </div>
                      
                      {editing[`enhanced_title-${index}`] ? (
                        <Input
                          value={editableData[index].enhanced_title}
                          onChange={(e) => handleTextChange(index, 'enhanced_title', e.target.value)}
                          className="w-full text-sm border-violet-200 focus:border-violet-300"
                          maxLength={60}
                        />
                      ) : (
                        <div className={`text-sm p-2 rounded-md ${wasInferred(item.original_title) ? 'bg-violet-50/50 border border-violet-100' : ''}`}>
                          {item.isLoading ? (
                            <Skeleton className="w-full h-6" />
                          ) : (
                            editableData[index].enhanced_title
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top py-4">
                    <div className="flex justify-end gap-2">
                      {editing[`enhanced_title-${index}`] ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSave(index, 'enhanced_title')}
                          className="h-8 border-green-200 bg-green-50 hover:bg-green-100 text-green-600"
                        >
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          Save
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(index, 'enhanced_title')}
                          className="h-8 border-blue-200 hover:bg-blue-50 text-blue-600"
                          disabled={item.isLoading}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(editableData[index].enhanced_title, 'title', index)}
                              disabled={item.isLoading}
                            >
                              {copiedItems[`title-${index}`] ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4 text-neutral-500" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Copy title</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
                
                {/* Description Row */}
                <TableRow key={`desc-${index}`} className="border-b border-neutral-100 bg-neutral-50/30">
                  <TableCell className="align-top py-4">
                    <div>
                      <Badge variant="outline" className="mb-1 text-xs font-normal bg-neutral-50 border-neutral-200">
                        Description • {item.original_description.length} chars
                      </Badge>
                      {item.original_description ? (
                        <p className="text-sm text-neutral-600">{item.original_description}</p>
                      ) : (
                        <p className="text-sm text-neutral-400 italic">No original description provided</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs font-normal bg-neutral-50 border-neutral-200"
                        >
                          {editableData[index].enhanced_description.length} chars
                        </Badge>
                        {wasInferred(item.original_description) && (
                          <Badge className="text-xs font-normal bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            <span>AI-Generated</span>
                          </Badge>
                        )}
                      </div>
                      
                      {editing[`enhanced_description-${index}`] ? (
                        <Textarea
                          value={editableData[index].enhanced_description}
                          onChange={(e) => handleTextChange(index, 'enhanced_description', e.target.value)}
                          className="w-full text-sm border-violet-200 focus:border-violet-300"
                          maxLength={160}
                          rows={3}
                        />
                      ) : (
                        <div className={`text-sm p-2 rounded-md ${wasInferred(item.original_description) ? 'bg-violet-50/50 border border-violet-100' : ''}`}>
                          {item.isLoading ? (
                            <Skeleton className="w-full h-16" />
                          ) : (
                            editableData[index].enhanced_description
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top py-4">
                    <div className="flex justify-end gap-2">
                      {editing[`enhanced_description-${index}`] ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSave(index, 'enhanced_description')}
                          className="h-8 border-green-200 bg-green-50 hover:bg-green-100 text-green-600"
                        >
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          Save
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(index, 'enhanced_description')}
                          className="h-8 border-blue-200 hover:bg-blue-50 text-blue-600"
                          disabled={item.isLoading}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(editableData[index].enhanced_description, 'desc', index)}
                              disabled={item.isLoading}
                            >
                              {copiedItems[`desc-${index}`] ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4 text-neutral-500" />
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
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MetaTable;
