import { WhyBadge } from "./WhyBadge";
import { Sparkles, TrendingUp, Clock } from "lucide-react";

interface Topic {
  name: string;
  effort: number; // 1-10
  marks: number; // 1-10
  category: "quick-win" | "strategic" | "specialist" | "skip";
}

interface EffortMarksChartProps {
  topics: Topic[];
}

export const EffortMarksChart = ({ topics }: EffortMarksChartProps) => {
  const getCategoryColor = (category: Topic["category"]) => {
    switch (category) {
      case "quick-win": return "bg-effort-low text-effort-low";
      case "strategic": return "bg-primary text-primary";
      case "specialist": return "bg-effort-medium text-effort-medium";
      case "skip": return "bg-muted-foreground/50 text-muted-foreground";
    }
  };

  const getCategoryLabel = (category: Topic["category"]) => {
    switch (category) {
      case "quick-win": return "Quick Wins";
      case "strategic": return "Strategic Focus";
      case "specialist": return "Specialist Topics";
      case "skip": return "Low Priority";
    }
  };

  const getCategoryIcon = (category: Topic["category"]) => {
    switch (category) {
      case "quick-win": return Sparkles;
      case "strategic": return TrendingUp;
      case "specialist": return Clock;
      case "skip": return Clock;
    }
  };

  // Group topics by category
  const groupedTopics = topics.reduce((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<Topic["category"], Topic[]>);

  const categories: Topic["category"][] = ["quick-win", "strategic", "specialist", "skip"];

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Effort vs Marks</h3>
          <p className="text-sm text-muted-foreground">Topics organized by study efficiency</p>
        </div>
        <WhyBadge explanation="Quick Wins give high marks for low effort. Strategic topics are important but need time. Specialist topics are high-effort for moderate gains." />
      </div>

      {/* Visual chart representation */}
      <div className="relative h-64 bg-muted/30 rounded-xl p-4 mb-6">
        {/* Axis labels */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground font-medium">
          Marks ↑
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-medium">
          Effort →
        </div>

        {/* Quadrant labels */}
        <div className="absolute top-6 left-8 text-xs font-medium text-effort-low">Quick Wins</div>
        <div className="absolute top-6 right-8 text-xs font-medium text-primary">Strategic</div>
        <div className="absolute bottom-8 left-8 text-xs font-medium text-muted-foreground">Skip</div>
        <div className="absolute bottom-8 right-8 text-xs font-medium text-effort-medium">Specialist</div>

        {/* Grid lines */}
        <div className="absolute inset-8 border border-dashed border-border rounded-lg">
          <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border" />
          <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-border" />
        </div>

        {/* Plot points */}
        <div className="absolute inset-8">
          {topics.map((topic, i) => {
            const x = (topic.effort / 10) * 100;
            const y = 100 - (topic.marks / 10) * 100;
            const colorClass = getCategoryColor(topic.category);
            
            return (
              <div
                key={i}
                className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-150 cursor-pointer ${colorClass.split(" ")[0]}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                title={topic.name}
              />
            );
          })}
        </div>
      </div>

      {/* Category legend with topics */}
      <div className="grid grid-cols-2 gap-4">
        {categories.map((category) => {
          const categoryTopics = groupedTopics[category] || [];
          const Icon = getCategoryIcon(category);
          const [bgColor, textColor] = getCategoryColor(category).split(" ");
          
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${bgColor}/10`}>
                  <Icon className={`w-3.5 h-3.5 ${textColor}`} />
                </div>
                <span className={`text-sm font-medium ${textColor}`}>
                  {getCategoryLabel(category)}
                </span>
                <span className="text-xs text-muted-foreground">({categoryTopics.length})</span>
              </div>
              <div className="pl-8 space-y-1">
                {categoryTopics.slice(0, 3).map((topic, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate">{topic.name}</p>
                ))}
                {categoryTopics.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{categoryTopics.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
