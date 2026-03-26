import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { WhyBadge } from "./WhyBadge";

interface RiskScoreProps {
  score: number; // 0-100
  label?: string;
  showExplanation?: boolean;
}

export const RiskScore = ({ score, label = "Risk Score", showExplanation = true }: RiskScoreProps) => {
  const getRiskLevel = () => {
    if (score <= 30) return { level: "low", text: "On Track", color: "risk-low" };
    if (score <= 60) return { level: "medium", text: "Needs Attention", color: "risk-medium" };
    return { level: "high", text: "At Risk", color: "risk-high" };
  };

  const risk = getRiskLevel();
  
  const Icon = risk.level === "low" ? CheckCircle : risk.level === "medium" ? AlertTriangle : AlertCircle;

  const getExplanation = () => {
    if (risk.level === "low") {
      return "You're covering priority topics well. Keep this pace and you'll be prepared.";
    }
    if (risk.level === "medium") {
      return "Some high-importance topics need more attention. Focus on your priority list today.";
    }
    return "Critical topics are under-covered with limited time remaining. Prioritize high-weight topics immediately.";
  };

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {showExplanation && <WhyBadge explanation={getExplanation()} />}
      </div>
      
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-${risk.color}-soft`}>
          <Icon className={`w-8 h-8 text-${risk.color}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <p className={`text-sm font-medium text-${risk.color}`}>{risk.text}</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 bg-${risk.color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};
