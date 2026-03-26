import { TrendingUp, Clock, Target, ChevronRight } from "lucide-react";
import { WhyBadge } from "./WhyBadge";

interface TopicCardProps {
  rank: number;
  name: string;
  importance: number; // 1-10
  effort: "low" | "medium" | "high";
  pyqFrequency: number; // percentage
  proficiency: number; // 0-100
  explanation: string;
  onClick?: () => void;
}

export const TopicCard = ({
  rank,
  name,
  importance,
  effort,
  pyqFrequency,
  proficiency,
  explanation,
  onClick,
}: TopicCardProps) => {
  const getEffortColor = () => {
    switch (effort) {
      case "low": return "bg-effort-low/10 text-effort-low";
      case "medium": return "bg-effort-medium/10 text-effort-medium";
      case "high": return "bg-effort-high/10 text-effort-high";
    }
  };

  const getEffortLabel = () => {
    switch (effort) {
      case "low": return "Quick Win";
      case "medium": return "Moderate";
      case "high": return "Deep Dive";
    }
  };

  return (
    <div 
      className="card-interactive p-5 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Rank badge */}
        <div className="priority-badge bg-primary text-primary-foreground">
          {rank}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {name}
              </h3>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {/* Importance */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="w-3.5 h-3.5" />
                  <span>Importance: <strong className="text-foreground">{importance}/10</strong></span>
                </div>
                
                {/* PYQ Frequency */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>PYQ: <strong className="text-foreground">{pyqFrequency}%</strong></span>
                </div>
              </div>
            </div>
            
            <WhyBadge explanation={explanation} />
          </div>
          
          {/* Effort badge */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getEffortColor()}`}>
                <Clock className="w-3 h-3" />
                {getEffortLabel()}
              </span>
              
              {/* Proficiency indicator */}
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${proficiency}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{proficiency}%</span>
              </div>
            </div>
            
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};
