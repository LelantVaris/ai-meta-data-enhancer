
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { UserCircle, LogOut } from "lucide-react";
import MetaEnhancer from "@/components/MetaEnhancer";
import Hero from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { toast } = useToast();
  
  // Check for payment status in URL
  const paymentStatus = searchParams.get("payment_status");
  
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      // Only handle payment status if it exists
      if (!paymentStatus) return;
      
      try {
        if (paymentStatus === "success" && user) {
          // Create or update user subscription status
          const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: user.id,
              subscription_status: 'active',
              subscription_type: 'one_time',
            }, { onConflict: 'user_id' });
          
          if (error) {
            console.error("Error updating subscription status:", error);
            toast({
              title: "Payment successful",
              description: "But we couldn't update your account. Please contact support.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Payment successful!",
              description: "Thank you for your purchase. You can now download CSV files anytime.",
            });
            
            // Get the return URL from localStorage
            const returnTo = localStorage.getItem('returnTo');
            if (returnTo && returnTo !== window.location.pathname) {
              navigate(returnTo);
            }
          }
        } else if (paymentStatus === "cancel") {
          toast({
            title: "Payment cancelled",
            description: "Your payment was cancelled. No charges were made.",
          });
          // Clear stored URL on cancel
          localStorage.removeItem('returnTo');
          localStorage.removeItem('shouldDownload');
        }

        // Clear the payment_status from URL to prevent multiple toasts
        setSearchParams(prev => {
          prev.delete("payment_status");
          return prev;
        });
      } catch (error) {
        console.error("Error in payment success handler:", error);
      }
    };
    
    handlePaymentSuccess();
  }, [paymentStatus, user, navigate, setSearchParams, toast]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="text-lg font-semibold">Meta Enhancer</div>
          
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <UserCircle className="h-5 w-5 text-neutral-500" />
                <span>{user.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
              Sign In / Sign Up
            </Button>
          )}
        </div>
      </header>
      
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-12">
        <Hero />
        <MetaEnhancer />
      </main>
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default Index;
