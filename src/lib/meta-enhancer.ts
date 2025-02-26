
import { ColumnDetectionResult, MetaData } from "./types";

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 160;

// System prompts for AI enhancement
const TITLE_SYSTEM_PROMPT = 
  `You are an expert SEO specialist. Optimize the given meta title to be compelling, concise, and under ${MAX_TITLE_LENGTH} characters. 
   Include important keywords, maintain clarity, and ensure it accurately represents the content.
   Do not use quotation marks in your output.`;

const DESCRIPTION_SYSTEM_PROMPT = 
  `You are an expert SEO specialist. Optimize the given meta description to be informative, engaging, and under ${MAX_DESCRIPTION_LENGTH} characters. 
   Include a clear value proposition, relevant keywords, and a subtle call to action when appropriate.
   Do not use quotation marks in your output.`;

export function enhanceMeta(data: MetaData[]): MetaData[] {
  return data.map(item => {
    // Process title with AI-like optimization
    const enhancedTitle = enhanceWithAISimulation(item.original_title, true);
    
    // Process description with AI-like optimization
    const enhancedDescription = enhanceWithAISimulation(item.original_description, false);
    
    return {
      ...item,
      enhanced_title: enhancedTitle,
      enhanced_description: enhancedDescription
    };
  });
}

function enhanceWithAISimulation(text: string, isTitle: boolean): string {
  if (!text) return '';
  
  // Apply rule-based enhancement as a fallback
  if (isTitle) {
    return optimizeTitle(text);
  } else {
    return optimizeDescription(text);
  }
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

// New function to detect meta title and description columns
export function detectMetaColumns(headers: string[]): ColumnDetectionResult {
  // Common patterns for title columns
  const titlePatterns = [
    /title/i, 
    /meta.?title/i, 
    /page.?title/i, 
    /seo.?title/i,
    /head/i
  ];
  
  // Common patterns for description columns
  const descriptionPatterns = [
    /desc/i, 
    /description/i, 
    /meta.?desc/i, 
    /meta.?description/i, 
    /seo.?desc/i,
    /excerpt/i,
    /summary/i
  ];
  
  let titleColumnIndex = -1;
  let titleMatchStrength = 0;
  
  let descriptionColumnIndex = -1;
  let descriptionMatchStrength = 0;
  
  // Find the best match for title column
  headers.forEach((header, index) => {
    for (let i = 0; i < titlePatterns.length; i++) {
      if (titlePatterns[i].test(header)) {
        // Higher index patterns are more specific, so they get higher strength
        const strength = titlePatterns.length - i;
        if (strength > titleMatchStrength) {
          titleMatchStrength = strength;
          titleColumnIndex = index;
        }
      }
    }
  });
  
  // Find the best match for description column
  headers.forEach((header, index) => {
    for (let i = 0; i < descriptionPatterns.length; i++) {
      if (descriptionPatterns[i].test(header)) {
        // Higher index patterns are more specific, so they get higher strength
        const strength = descriptionPatterns.length - i;
        if (strength > descriptionMatchStrength) {
          descriptionMatchStrength = strength;
          descriptionColumnIndex = index;
        }
      }
    }
  });
  
  // If we still couldn't find columns, make some educated guesses
  if (titleColumnIndex === -1 && headers.length > 0) {
    // If there's only one column with "title" in its name
    const titleColumns = headers.filter(header => /title/i.test(header));
    if (titleColumns.length === 1) {
      titleColumnIndex = headers.indexOf(titleColumns[0]);
    } else if (headers.length >= 2) {
      // Assume first or second column might be title (common in exported data)
      titleColumnIndex = 0;
    }
  }
  
  if (descriptionColumnIndex === -1 && headers.length > 1) {
    // If there's only one column with "desc" in its name
    const descColumns = headers.filter(header => /desc/i.test(header));
    if (descColumns.length === 1) {
      descriptionColumnIndex = headers.indexOf(descColumns[0]);
    } else if (headers.length >= 2) {
      // If we found a title column, description might be the next column
      descriptionColumnIndex = (titleColumnIndex === 0) ? 1 : titleColumnIndex + 1;
      
      // Make sure title and description columns are different
      if (descriptionColumnIndex === titleColumnIndex && headers.length > 2) {
        descriptionColumnIndex = titleColumnIndex + 1;
      }
    }
  }
  
  return {
    titleColumnIndex,
    descriptionColumnIndex,
    headers
  };
}
