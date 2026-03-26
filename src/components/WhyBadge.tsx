import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WhyBadgeProps {
  explanation: string;
  className?: string;
}

export const WhyBadge = ({ explanation, className = "" }: WhyBadgeProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`why-badge ${className}`}>
          <HelpCircle className="w-3 h-3" />
          Why?
        </span>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="max-w-xs bg-card border border-border shadow-elevated p-3 rounded-xl"
      >
        <p className="text-sm text-foreground leading-relaxed">{explanation}</p>
      </TooltipContent>
    </Tooltip>
  );
};
