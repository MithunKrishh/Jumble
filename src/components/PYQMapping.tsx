import { FileText, TrendingUp } from "lucide-react";
import { WhyBadge } from "./WhyBadge";

interface TopicPYQ {
  topic: string;
  appearances: number;
  years: string[];
  trend: "rising" | "stable" | "declining";
  weightage: number;
}

interface PYQMappingProps {
  data: TopicPYQ[];
}

export const PYQMapping = ({ data }: PYQMappingProps) => {
  const getTrendColor = (trend: TopicPYQ["trend"]) => {
    switch (trend) {
      case "rising": return "text-risk-low";
      case "stable": return "text-effort-medium";
      case "declining": return "text-muted-foreground";
    }
  };

  const getTrendLabel = (trend: TopicPYQ["trend"]) => {
    switch (trend) {
      case "rising": return "↑ Rising";
      case "stable": return "→ Stable";
      case "declining": return "↓ Declining";
    }
  };

  const maxWeightage = Math.max(...data.map(d => d.weightage));

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">PYQ Analysis</h3>
          <p className="text-sm text-muted-foreground">Topic frequency from previous years</p>
        </div>
        <WhyBadge explanation="Topics that appear frequently in past exams are likely to appear again. Rising trends indicate increasing importance." />
      </div>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">{item.topic}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.appearances} times</span>
                    <span>•</span>
                    <span className={getTrendColor(item.trend)}>{getTrendLabel(item.trend)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-lg font-bold text-foreground">{item.weightage}%</span>
                <p className="text-xs text-muted-foreground">weightage</p>
              </div>
            </div>
            
            {/* Weightage bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-500"
                style={{ width: `${(item.weightage / maxWeightage) * 100}%` }}
              />
            </div>
            
            {/* Years pills */}
            <div className="flex gap-1 mt-2 flex-wrap">
              {item.years.map((year, i) => (
                <span 
                  key={i} 
                  className="px-2 py-0.5 bg-secondary rounded text-xs text-muted-foreground"
                >
                  {year}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
