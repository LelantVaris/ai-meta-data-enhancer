
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { UserCircle, LogOut } from "lucide-react";
import MetaEnhancer from "@/components/MetaEnhancer";
import Hero from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { toast } = useToast();
  
  // Check for payment status in URL
  const paymentStatus = searchParams.get("payment_status");
  
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (paymentStatus === "success" && user) {
        try {
          // Update user metadata to indicate they've paid
          const { error } = await supabase.auth.updateUser({
            data: { paid_user: true }
          });
          
          if (error) throw error;
          
          toast({
            title: "Payment successful!",
            description: "Thank you for your purchase. You can now download CSV files anytime.",
          });
        } catch (error) {
          console.error("Error updating user metadata:", error);
          toast({
            title: "Payment successful",
            description: "But we couldn't update your account. Please contact support.",
            variant: "destructive",
          });
        }
      } else if (paymentStatus === "cancel") {
        toast({
          title: "Payment cancelled",
          description: "Your payment was cancelled. No charges were made.",
        });
      }
    };
    
    handlePaymentSuccess();
  }, [paymentStatus, user, toast]);

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
