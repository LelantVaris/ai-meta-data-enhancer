
export const wasGenerated = (original: string, enhanced: string): boolean => {
  return !original || original.trim() === '';
};

export const wasRewritten = (original: string, enhanced: string): boolean => {
  return original && original.trim() !== '' && 
         enhanced && enhanced.trim() !== '' && 
         original.trim() !== enhanced.trim();
};
