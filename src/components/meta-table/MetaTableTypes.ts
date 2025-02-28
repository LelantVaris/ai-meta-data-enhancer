import { MetaData } from "@/lib/types";

export interface MetaTableProps {
  data: (MetaData & { isLoading?: boolean })[];
  onDataChange?: (updatedData: MetaData[]) => void;
}

export interface MetaItemProps {
  item: MetaData & { isLoading?: boolean };
  index: number;
  isFeatured?: boolean;
  onDataChange: (item: MetaData & { isLoading?: boolean }, field: 'enhanced_title' | 'enhanced_description', value: string) => void;
  copiedItems: Record<string, boolean>;
  onCopy: (text: string, type: string, index: number) => void;
}

export interface MetaStatsProps {
  length: number;
  wasGenerated: boolean;
  wasRewritten: boolean;
  isFeatured?: boolean; // Keeping this for backward compatibility but we won't use it
}
