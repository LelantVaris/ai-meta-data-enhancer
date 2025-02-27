
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputSkeleton } from "@/components/ui/skeleton";
import { MetaItemProps } from "./MetaTableTypes";
import { MetaStats } from "./MetaStats";
import { CopyButton } from "./CopyButton";
import { wasGenerated, wasRewritten } from "./utils";

export const MetaItem = ({ 
  item, 
  index, 
  isFeatured = false,
  onDataChange,
  copiedItems,
  onCopy
}: MetaItemProps) => {
  const keyPrefix = isFeatured ? 'featured' : 'regular';

  return (
    <>
      <td className="align-top py-4 px-4 w-[450px] max-w-[450px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <MetaStats
              length={item.enhanced_title.length}
              wasGenerated={wasGenerated(item.original_title, item.enhanced_title)}
              wasRewritten={wasRewritten(item.original_title, item.enhanced_title)}
              isFeatured={isFeatured}
            />
            
            <CopyButton
              onCopy={() => onCopy(item.enhanced_title, `title-${keyPrefix}`, index)}
              isCopied={copiedItems[`title-${keyPrefix}-${index}`]}
              isLoading={item.isLoading}
              label="title"
            />
          </div>
          
          {item.original_title ? (
            <p className="text-xs text-muted-foreground break-words">
              Original: {item.original_title}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No original title provided
            </p>
          )}

          {item.isLoading ? (
            <InputSkeleton className="h-10" />
          ) : (
            <Input
              value={item.enhanced_title}
              onChange={(e) => onDataChange(item, 'enhanced_title', e.target.value)}
              className="w-full border-muted"
              maxLength={60}
              placeholder="Enter enhanced title"
            />
          )}
        </div>
      </td>
      
      <td className="align-top py-4 px-4 w-[550px] max-w-[550px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <MetaStats
              length={item.enhanced_description.length}
              wasGenerated={wasGenerated(item.original_description, item.enhanced_description)}
              wasRewritten={wasRewritten(item.original_description, item.enhanced_description)}
              isFeatured={false}
            />
            
            <CopyButton
              onCopy={() => onCopy(item.enhanced_description, `desc-${keyPrefix}`, index)}
              isCopied={copiedItems[`desc-${keyPrefix}-${index}`]}
              isLoading={item.isLoading}
              label="description"
            />
          </div>
          
          {item.original_description ? (
            <p className="text-xs text-muted-foreground break-words">
              Original: {item.original_description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No original description provided
            </p>
          )}

          {item.isLoading ? (
            <InputSkeleton className="h-20" />
          ) : (
            <Textarea
              value={item.enhanced_description}
              onChange={(e) => onDataChange(item, 'enhanced_description', e.target.value)}
              className="w-full border-muted"
              maxLength={160}
              rows={3}
              placeholder="Enter enhanced description"
            />
          )}
        </div>
      </td>
    </>
  );
};
