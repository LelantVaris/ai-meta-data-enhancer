import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { MetaStatsProps } from "./MetaTableTypes";
import { useIsMobile } from "@/hooks/use-mobile";

export const MetaStats = ({ length, wasGenerated, wasRewritten }: MetaStatsProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge 
        variant="outline" 
        className="text-[10px] md:text-xs font-normal bg-muted/30 border-border h-5 md:h-6"
      >
        {length} chars
      </Badge>
      {wasGenerated && (
        <Badge className="text-[10px] md:text-xs font-normal bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1 pointer-events-none h-5 md:h-6">
          <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3" />
          <span>{isMobile ? 'AI-Gen' : 'AI-Generated'}</span>
        </Badge>
      )}
      {wasRewritten && (
        <Badge className="text-[10px] md:text-xs font-normal bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 pointer-events-none h-5 md:h-6">
          <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3" />
          <span>{isMobile ? 'AI-Edit' : 'AI-Rewritten'}</span>
        </Badge>
      )}
    </div>
  );
};
