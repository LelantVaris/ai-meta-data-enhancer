import { toast } from "@/hooks/use-toast";

// Usage limits 
export const FREE_TIER_LIMITS = {
  MAX_ENTRIES_PER_USE: 50,       // Max entries to process for free users
  MAX_USES_PER_MONTH: 2          // Max uses per month for free users
};

export const PAID_TIER_LIMITS = {
  MAX_ENTRIES_PER_USE: 500       // Max entries to process for paid users
};

export const UPLOAD_LIMITS = {
  MAX_ROWS_PER_FILE: 5000        // Max rows allowed in any uploaded file
};

// Keys for storing usage data in localStorage
const STORAGE_KEYS = {
  MONTHLY_USAGE_COUNT: 'meta_enhancer_monthly_usage',
  LAST_RESET_DATE: 'meta_enhancer_last_reset_date'
};

// Interface for usage data
interface UsageData {
  count: number;
  lastResetDate: string;
}

/**
 * Initialize usage tracking if not already present
 */
export const initializeUsageTracking = (): void => {
  const currentData = getUsageData();
  
  // If no data exists, create initial data
  if (!currentData) {
    const initialData: UsageData = {
      count: 0,
      lastResetDate: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.MONTHLY_USAGE_COUNT, JSON.stringify(initialData));
  } else {
    // Check if we should reset the monthly counter
    const lastResetDate = new Date(currentData.lastResetDate);
    const currentDate = new Date();
    
    // Reset counter if it's a new month
    if (lastResetDate.getMonth() !== currentDate.getMonth() || 
        lastResetDate.getFullYear() !== currentDate.getFullYear()) {
      const updatedData: UsageData = {
        count: 0,
        lastResetDate: currentDate.toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.MONTHLY_USAGE_COUNT, JSON.stringify(updatedData));
    }
  }
};

/**
 * Get current usage data from localStorage
 */
export const getUsageData = (): UsageData | null => {
  const storedData = localStorage.getItem(STORAGE_KEYS.MONTHLY_USAGE_COUNT);
  if (!storedData) return null;
  
  try {
    return JSON.parse(storedData) as UsageData;
  } catch (error) {
    console.error('Error parsing usage data:', error);
    return null;
  }
};

/**
 * Check if user has reached their monthly usage limit
 */
export const hasReachedMonthlyUsageLimit = (isPaidUser: boolean): boolean => {
  if (isPaidUser) return false;
  
  const usageData = getUsageData();
  if (!usageData) return false;
  
  return usageData.count >= FREE_TIER_LIMITS.MAX_USES_PER_MONTH;
};

/**
 * Check if file has too many rows to be uploaded
 */
export const hasTooManyRows = (rowCount: number): boolean => {
  return rowCount > UPLOAD_LIMITS.MAX_ROWS_PER_FILE;
};

/**
 * Get max number of entries to process based on user status
 */
export const getMaxEntriesToProcess = (isPaidUser: boolean): number => {
  return isPaidUser ? PAID_TIER_LIMITS.MAX_ENTRIES_PER_USE : FREE_TIER_LIMITS.MAX_ENTRIES_PER_USE;
};

/**
 * Record usage of the enhancer
 */
export const recordUsage = (): void => {
  const usageData = getUsageData();
  if (!usageData) {
    initializeUsageTracking();
    recordUsage();
    return;
  }
  
  const updatedData: UsageData = {
    ...usageData,
    count: usageData.count + 1
  };
  
  localStorage.setItem(STORAGE_KEYS.MONTHLY_USAGE_COUNT, JSON.stringify(updatedData));
};

/**
 * Get remaining uses this month for free users
 */
export const getRemainingUses = (): number => {
  const usageData = getUsageData();
  if (!usageData) return FREE_TIER_LIMITS.MAX_USES_PER_MONTH;
  
  return Math.max(0, FREE_TIER_LIMITS.MAX_USES_PER_MONTH - usageData.count);
};

/**
 * Get a simple message for the usage limit banner
 */
export const getUsageLimitMessage = (isPaidUser: boolean): string => {
  if (isPaidUser) {
    return "You have premium access.";
  }
  
  const remainingUses = getRemainingUses();
  return `Free uses remaining this month: ${remainingUses}`;
}; 