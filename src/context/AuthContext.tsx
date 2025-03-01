import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  subscriptionLoading: boolean;
  isPaidUser: boolean;
  checkSubscriptionStatus: () => Promise<boolean>;
  signOut: () => Promise<void>;
  logAuthState: () => { user: User | null; isAuthenticated: boolean };
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  subscriptionLoading: false,
  isPaidUser: false,
  checkSubscriptionStatus: async () => false,
  signOut: async () => {},
  logAuthState: () => ({ user: null, isAuthenticated: false }),
  isLoading: true,
  isAuthenticated: false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Memoize checkSubscriptionStatus with useCallback to avoid dependency issues
  const checkSubscriptionStatus = useCallback(async (): Promise<boolean> => {
    // If we have a recent check, use the cached value
    if (lastCheck && (new Date().getTime() - lastCheck.getTime()) < CACHE_EXPIRATION_MS) {
      return isPaidUser;
    }

    if (!user) {
      setIsPaidUser(false);
      return false;
    }
    
    setSubscriptionLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('subscription_status, subscription_type')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setSubscriptionLoading(false);
      setLastCheck(new Date());
      
      if (error) {
        console.error("Error checking subscription status:", error);
        setIsPaidUser(false);
        return false;
      }
      
      if (!data) {
        setIsPaidUser(false);
        return false;
      } else if (
        (data.subscription_type === 'subscription' && data.subscription_status === 'active') ||
        (data.subscription_type === 'one_time' && data.subscription_status === 'completed')
      ) {
        setIsPaidUser(true);
        return true;
      } else {
        setIsPaidUser(false);
        return false;
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      setSubscriptionLoading(false);
      setIsPaidUser(false);
      return false;
    }
  }, [user, isPaidUser, lastCheck, CACHE_EXPIRATION_MS]); // Include all dependencies

  // Check subscription status whenever user changes
  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    } else {
      setIsPaidUser(false);
    }
  }, [user, checkSubscriptionStatus]); // Add checkSubscriptionStatus as dependency

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const logAuthState = useCallback(() => {
    console.log("[AuthContext] Current auth state:");
    console.log("[AuthContext] User:", user);
    console.log("[AuthContext] isLoading:", loading);
    console.log("[AuthContext] isAuthenticated:", !!user);
    
    // Try to get the user's subscription status if logged in
    if (user) {
      supabase
        .from('user_subscriptions')
        .select('subscription_status, subscription_type')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error("[AuthContext] Error fetching subscription:", error);
          } else {
            console.log("[AuthContext] Subscription data:", data);
          }
        });
    }
    
    return { user, isAuthenticated: !!user };
  }, [user, loading]);

  const value = {
    session,
    user,
    loading,
    subscriptionLoading,
    isPaidUser,
    checkSubscriptionStatus,
    signOut,
    logAuthState,
    isLoading: loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export the context to be imported in the useAuth hook file
export { AuthContext };
