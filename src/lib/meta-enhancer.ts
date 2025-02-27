import { ColumnDetectionResult, MetaData } from "./types";
import { supabase } from "@/integrations/supabase/client";

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 160;

export function enhanceMeta(data: MetaData[]): Promise<MetaData[]> {
  // First, handle any missing fields using the rule-based approach
  const preparedData = data.map(item => {
    let originalTitle = item.original_title;
    let originalDescription = item.original_description;
    
    // Handle missing fields by inferring from the other field
    if (!originalTitle && originalDescription) {
      // Generate title from description
      originalTitle = inferTitleFromDescription(originalDescription);
    } else if (originalTitle && !originalDescription) {
      // Generate description from title
      originalDescription = inferDescriptionFromTitle(originalTitle);
    }
    
    return {
      ...item,
      original_title: originalTitle || '',
      original_description: originalDescription || '',
      enhanced_title: '',
      enhanced_description: ''
    };
  });

  // Then, enhance the data using either rule-based or AI-based approach
  return enhanceDataWithAI(preparedData);
}

// New streaming version
export function enhanceMetaStreaming(
  data: MetaData[],
  onItemComplete: (index: number, item: Partial<MetaData>) => void,
  onAllComplete: () => void
): void {
  // Handle missing fields first
  const preparedData = data.map(item => {
    let originalTitle = item.original_title;
    let originalDescription = item.original_description;
    
    if (!originalTitle && originalDescription) {
      originalTitle = inferTitleFromDescription(originalDescription);
    } else if (originalTitle && !originalDescription) {
      originalDescription = inferDescriptionFromTitle(originalTitle);
    }
    
    return {
      ...item,
      original_title: originalTitle || '',
      original_description: originalDescription || ''
    };
  });

  // We'll process items in small batches to avoid overwhelming the API
  const BATCH_SIZE = 3;
  let completedCount = 0;
  
  const processBatch = async (startIndex: number) => {
    const endIndex = Math.min(startIndex + BATCH_SIZE, preparedData.length);
    const batchPromises = [];
    
    for (let i = startIndex; i < endIndex; i++) {
      batchPromises.push(processItem(i, preparedData[i]));
    }
    
    await Promise.all(batchPromises);
    
    // Process next batch if there are more items
    if (endIndex < preparedData.length) {
      processBatch(endIndex);
    } else {
      onAllComplete();
    }
  };
  
  const processItem = async (index: number, item: MetaData) => {
    try {
      // Process both title and description
      let enhancedTitle: string;
      let enhancedDescription: string;
      
      // Process title
      if (!item.original_title || item.original_title.length <= MAX_TITLE_LENGTH) {
        enhancedTitle = optimizeTitle(item.original_title);
      } else {
        try {
          enhancedTitle = await enhanceWithAI(item.original_title, true, MAX_TITLE_LENGTH);
        } catch (error) {
          console.error("Error enhancing title with AI, falling back to rule-based:", error);
          enhancedTitle = optimizeTitle(item.original_title);
        }
      }
      
      // Process description
      if (!item.original_description || item.original_description.length <= MAX_DESCRIPTION_LENGTH) {
        enhancedDescription = optimizeDescription(item.original_description);
      } else {
        try {
          enhancedDescription = await enhanceWithAI(item.original_description, false, MAX_DESCRIPTION_LENGTH);
        } catch (error) {
          console.error("Error enhancing description with AI, falling back to rule-based:", error);
          enhancedDescription = optimizeDescription(item.original_description);
        }
      }
      
      // Send both title and description together
      onItemComplete(index, {
        enhanced_title: enhancedTitle,
        enhanced_description: enhancedDescription
      });
      
      completedCount++;
      
    } catch (error) {
      console.error(`Error processing item ${index}:`, error);
      // Fall back to rule-based for both fields if there's an error
      onItemComplete(index, {
        enhanced_title: optimizeTitle(item.original_title),
        enhanced_description: optimizeDescription(item.original_description)
      });
      completedCount++;
    }
  };
  
  // Start processing the first batch
  processBatch(0);
}

async function enhanceDataWithAI(data: MetaData[]): Promise<MetaData[]> {
  const enhancedData: MetaData[] = [];
  
  for (const item of data) {
    // Enhanced title - rule-based if within limits, AI-based if not
    let enhancedTitle: string;
    if (!item.original_title || item.original_title.length <= MAX_TITLE_LENGTH) {
      enhancedTitle = optimizeTitle(item.original_title);
    } else {
      try {
        enhancedTitle = await enhanceWithAI(item.original_title, true, MAX_TITLE_LENGTH);
      } catch (error) {
        console.error("Error enhancing title with AI, falling back to rule-based:", error);
        enhancedTitle = optimizeTitle(item.original_title);
      }
    }
    
    // Enhanced description - rule-based if within limits, AI-based if not
    let enhancedDescription: string;
    if (!item.original_description || item.original_description.length <= MAX_DESCRIPTION_LENGTH) {
      enhancedDescription = optimizeDescription(item.original_description);
    } else {
      try {
        enhancedDescription = await enhanceWithAI(item.original_description, false, MAX_DESCRIPTION_LENGTH);
      } catch (error) {
        console.error("Error enhancing description with AI, falling back to rule-based:", error);
        enhancedDescription = optimizeDescription(item.original_description);
      }
    }
    
    enhancedData.push({
      ...item,
      enhanced_title: enhancedTitle,
      enhanced_description: enhancedDescription
    });
  }
  
  return enhancedData;
}

async function enhanceWithAI(text: string, isTitle: boolean, maxLength: number): Promise<string> {
  if (!text) return '';
  
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('enhance-meta', {
      body: JSON.stringify({
        text,
        isTitle,
        maxLength
      }),
    });
    
    if (error) {
      throw new Error(`Error enhancing with AI: ${error.message}`);
    }
    
    return data?.enhancedText || '';
  } catch (error) {
    console.error('AI enhancement failed:', error);
    // Fall back to rule-based enhancement
    return isTitle ? optimizeTitle(text) : optimizeDescription(text);
  }
}

function inferTitleFromDescription(description: string): string {
  if (!description) return '';
  
  // Extract key concepts from the first sentence
  const firstSentence = description.split(/[.!?]/, 1)[0].trim();
  
  // Use the first 6-8 words or less if they're long words
  const words = firstSentence.split(/\s+/);
  const titleWords = words.slice(0, Math.min(7, words.length));
  
  // Make it look like a title with capitalization
  let inferredTitle = titleWords.join(' ');
  
  // Capitalize each word (Title Case)
  inferredTitle = inferredTitle
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Ensure it's not too long
  return inferredTitle.length > MAX_TITLE_LENGTH 
    ? inferredTitle.substring(0, MAX_TITLE_LENGTH - 3) + '...' 
    : inferredTitle;
}

function inferDescriptionFromTitle(title: string): string {
  if (!title) return '';
  
  // Expand the title into a descriptive sentence
  const words = title.split(/\s+/);
  
  // Basic expansion template
  let inferredDescription = `Learn about ${title.toLowerCase()}. `;
  
  // Add a call to action
  inferredDescription += 'Discover key insights and practical information to enhance your understanding.';
  
  // Ensure it's not too long
  return inferredDescription.length > MAX_DESCRIPTION_LENGTH 
    ? inferredDescription.substring(0, MAX_DESCRIPTION_LENGTH - 3) + '...' 
    : inferredDescription;
}

function optimizeTitle(title: string): string {
  if (!title) return '';
  
  // Apply rule-based optimizations
  const optimized = title
    .trim()
    // Capitalize first letter of each word for titles
    .replace(/\b\w/g, c => c.toUpperCase())
    // Remove excessive punctuation
    .replace(/[!]{2,}/g, '!')
    .replace(/[.]{2,}/g, '.')
    .replace(/\s{2,}/g, ' ');
  
  return optimized.substring(0, MAX_TITLE_LENGTH);
}

function optimizeDescription(description: string): string {
  if (!description) return '';
  
  // Apply rule-based optimizations
  const optimized = description
    .trim()
    // Capitalize first letter of the description
    .replace(/^\w/, c => c.toUpperCase())
    // Ensure description ends with a period if it doesn't have ending punctuation
    .replace(/([^.!?])$/, '$1.')
    // Remove excessive spaces
    .replace(/\s{2,}/g, ' ');
  
  return optimized.substring(0, MAX_DESCRIPTION_LENGTH);
}

// Function to detect meta title and description columns
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
