
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { MetaStatsProps } from "./MetaTableTypes";

export const MetaStats = ({ length, wasGenerated, wasRewritten, isFeatured }: MetaStatsProps) => {
  return (
    <div className="flex items-center gap-1">
      <Badge 
        variant="outline" 
        className="text-xs font-normal bg-muted/30 border-border"
      >
        {length} chars
      </Badge>
      {wasGenerated && (
        <Badge className="text-xs font-normal bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          <span>AI-Generated</span>
        </Badge>
      )}
      {wasRewritten && (
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
  );
};
