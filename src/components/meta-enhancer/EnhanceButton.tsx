import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface EnhanceButtonProps {
  isProcessing: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const EnhanceButton = ({ isProcessing, disabled = false, onClick }: EnhanceButtonProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="mt-3 md:mt-6">
      <Button
        onClick={onClick}
        disabled={disabled || isProcessing}
        className="w-full bg-neutral-900 hover:bg-neutral-800 text-white transition-all text-xs md:text-sm"
        size={isMobile ? "sm" : "default"}
      >
        {isProcessing ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 md:mr-3 h-3 w-3 md:h-4 md:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            Enhance Meta Data
          </span>
        )}
      </Button>
    </div>
  );
};

export default EnhanceButton;
