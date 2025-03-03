import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ErrorStateProps {
  message?: string;
  backLink?: string;
  backText?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  message = "Something went wrong", 
  backLink, 
  backText = "Go back",
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex justify-center items-center h-64 bg-muted/30 rounded-lg">
      <div className="text-center">
        <p className="text-destructive font-medium mb-2">
          {message}
        </p>
        <div className="flex gap-3 mt-4 justify-center">
          {onRetry && (
            <Button 
              variant="outline" 
              onClick={onRetry}
            >
              Try Again
            </Button>
          )}
          {backLink && (
            <Button 
              variant="outline" 
              asChild
            >
              <Link href={backLink}>
                {backText}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
