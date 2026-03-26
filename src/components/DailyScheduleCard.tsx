import { Clock, CheckCircle2, Circle, Play } from "lucide-react";
import { WhyBadge } from "./WhyBadge";
import { Button } from "./ui/button";

interface ScheduleItem {
  id: string;
  time: string;
  topic: string;
  duration: string;
  status: "completed" | "current" | "upcoming";
  explanation: string;
}

interface DailyScheduleCardProps {
  items: ScheduleItem[];
  onStartSession?: (id: string) => void;
}

export const DailyScheduleCard = ({ items, onStartSession }: DailyScheduleCardProps) => {
  const getStatusStyles = (status: ScheduleItem["status"]) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          iconColor: "text-risk-low",
          bgColor: "bg-risk-low-soft",
          lineColor: "bg-risk-low",
        };
      case "current":
        return {
          icon: Play,
          iconColor: "text-primary",
          bgColor: "bg-primary-soft",
          lineColor: "bg-primary",
        };
      case "upcoming":
        return {
          icon: Circle,
          iconColor: "text-muted-foreground",
          bgColor: "bg-muted",
          lineColor: "bg-muted",
        };
    }
  };

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Today's Focus</h3>
          <p className="text-sm text-muted-foreground">Adaptive schedule based on your priorities</p>
        </div>
        <WhyBadge explanation="This schedule adapts to your performance and available time. Tasks are ordered by impact on your exam readiness." />
      </div>

      <div className="space-y-1">
        {items.map((item, index) => {
          const styles = getStatusStyles(item.status);
          const Icon = styles.icon;
          const isLast = index === items.length - 1;

          return (
            <div key={item.id} className="relative flex gap-4">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.bgColor}`}>
                  <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1 ${styles.lineColor}`} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-6 ${item.status === "current" ? "opacity-100" : "opacity-75"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{item.duration}</span>
                    </div>
                    <h4 className={`font-medium mt-1 ${item.status === "current" ? "text-primary" : "text-foreground"}`}>
                      {item.topic}
                    </h4>
                  </div>
                  
                  {item.status === "current" && (
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => onStartSession?.(item.id)}
                    >
                      Start
                    </Button>
                  )}
                </div>
                
                {item.status === "current" && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.explanation}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
