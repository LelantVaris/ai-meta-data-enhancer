
export interface MetaData {
  original_title: string;
  original_description: string;
  enhanced_title: string;
  enhanced_description: string;
}

export interface ColumnDetectionResult {
  titleColumnIndex: number;
  descriptionColumnIndex: number;
  headers: string[];
}
