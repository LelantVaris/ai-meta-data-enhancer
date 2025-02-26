
import { MetaData } from "./types";

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 160;

export function enhanceMeta(data: MetaData[]): MetaData[] {
  return data.map(item => {
    // Process title
    const enhancedTitle = optimizeTitle(item.original_title);
    
    // Process description
    const enhancedDescription = optimizeDescription(item.original_description);
    
    return {
      ...item,
      enhanced_title: enhancedTitle,
      enhanced_description: enhancedDescription
    };
  });
}

function optimizeTitle(title: string): string {
  if (!title) return '';
  
  let optimized = title;
  
  // If title is already within limits, return it
  if (optimized.length <= MAX_TITLE_LENGTH) {
    return optimized;
  }
  
  // Try to truncate at a natural break point
  const breakPoints = [' | ', ' - ', ': ', ', ', ' '];
  
  for (const breakPoint of breakPoints) {
    const lastIndex = optimized.lastIndexOf(breakPoint, MAX_TITLE_LENGTH);
    if (lastIndex > 0 && lastIndex <= MAX_TITLE_LENGTH) {
      return optimized.substring(0, lastIndex);
    }
  }
  
  // If no good breaking point, just truncate
  return optimized.substring(0, MAX_TITLE_LENGTH - 3) + '...';
}

function optimizeDescription(description: string): string {
  if (!description) return '';
  
  let optimized = description;
  
  // If description is already within limits, return it
  if (optimized.length <= MAX_DESCRIPTION_LENGTH) {
    return optimized;
  }
  
  // Try to truncate at a natural break point
  const breakPoints = ['. ', '! ', '? ', '; ', ': ', ', '];
  
  for (const breakPoint of breakPoints) {
    const lastIndex = optimized.lastIndexOf(breakPoint, MAX_DESCRIPTION_LENGTH);
    if (lastIndex > 0 && lastIndex <= MAX_DESCRIPTION_LENGTH) {
      return optimized.substring(0, lastIndex + 1); // Include the period or other punctuation
    }
  }
  
  // If no good breaking point, look for a space
  const lastSpace = optimized.lastIndexOf(' ', MAX_DESCRIPTION_LENGTH - 3);
  if (lastSpace > 0) {
    return optimized.substring(0, lastSpace) + '...';
  }
  
  // Worst case, just truncate
  return optimized.substring(0, MAX_DESCRIPTION_LENGTH - 3) + '...';
}
