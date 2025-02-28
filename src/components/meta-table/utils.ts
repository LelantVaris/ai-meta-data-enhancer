export const wasGenerated = (original: string, enhanced: string): boolean => {
  // Only show the AI-Generated label when:
  // 1. Original is empty or whitespace only
  // 2. Enhanced is NOT empty (has actual content)
  const isOriginalEmpty = !original || original.trim() === '';
  const isEnhancedNotEmpty = Boolean(enhanced && enhanced.trim() !== '');
  return isOriginalEmpty && isEnhancedNotEmpty;
};

export const wasRewritten = (original: string, enhanced: string): boolean => {
  // Only show the AI-Rewritten label when:
  // 1. Original has content
  // 2. Enhanced has content
  // 3. They are different from each other (case-insensitive)
  const isOriginalNotEmpty = Boolean(original && original.trim() !== '');
  const isEnhancedNotEmpty = Boolean(enhanced && enhanced.trim() !== '');
  const areDifferent = original?.trim().toLowerCase() !== enhanced?.trim().toLowerCase();
  return isOriginalNotEmpty && isEnhancedNotEmpty && areDifferent;
};
