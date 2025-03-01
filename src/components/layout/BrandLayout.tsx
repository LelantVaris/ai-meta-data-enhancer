import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Github, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";

interface BrandLayoutProps {
  children: React.ReactNode;
}

const BrandLayout: React.FC<BrandLayoutProps> = ({ children }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'signup'>('login');
  const { user, signOut } = useAuth();
  
  const openAuthModal = (view: 'login' | 'signup') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };
  
  const handleFeedbackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const feedback = formData.get("feedback") as string;
    
    // Here you would typically send the feedback to your backend
    console.log("Feedback submitted:", feedback);
    
    toast({
      title: "Feedback received",
      description: "Thank you for your feedback!",
    });
    
    // Close the popover by clicking outside
    document.body.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 py-4 px-6 flex justify-between items-center bg-transparent z-50">
        {/* Logo (top left) */}
        <Link to="/" className="flex items-center">
          <span className="font-bold text-2xl">Meta Enhancer</span>
        </Link>

        {/* Right side buttons (top right) */}
        <div className="flex items-center space-x-4">
          {user ? (
            <Button variant="ghost" onClick={signOut}>
              Sign Out
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => openAuthModal('login')}>
                Log In
              </Button>
              <Button variant="default" onClick={() => openAuthModal('signup')}>
                Get started $3.99/month
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content with padding to avoid overlap with fixed elements */}
      <main className="flex-grow pt-16 pb-16">
        {children}
      </main>

      {/* Fixed Footer with Feedback and GitHub link */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 px-6 flex justify-between items-center z-50">
        {/* Feedback element (bottom left) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 bg-white/80 backdrop-blur-sm">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <form onSubmit={handleFeedbackSubmit} className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Your Feedback</h4>
                <p className="text-sm text-muted-foreground">
                  Help us improve our product with your suggestions
                </p>
              </div>
              <Textarea 
                name="feedback" 
                placeholder="Your feedback here..." 
                className="min-h-[100px]" 
                required
              />
              <Button type="submit">Submit Feedback</Button>
            </form>
          </PopoverContent>
        </Popover>

        {/* Empty div to maintain footer spacing after removing GitHub button */}
        <div></div>
      </footer>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView={authModalView}
      />
    </div>
  );
};

export default BrandLayout; 