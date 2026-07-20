import { AuthenticatedNavbar } from "@/components/AuthenticatedNavbar";
import { DailyScheduleCard } from "@/components/DailyScheduleCard";
import { WhyBadge } from "@/components/WhyBadge";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SchedulePage = () => {
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates = [14, 15, 16, 17, 18, 19, 20];
  const todayIndex = 2; // Wednesday

  const [currentDate] = useState(new Date());
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    planned: 28,
    completed: 12,
    missed: 2,
    upcoming: 14,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: topicsData, error } = await supabase
          .from("topics" as any)
          .select("*");
        
        if (error) throw error;
        
        if (topicsData && topicsData.length > 0) {
          const schedule = (topicsData as any[]).slice(0, 6).map((t, idx) => ({
            id: t.id,
            time: `${9 + idx}:00 AM`,
            topic: `${t.subject} - ${t.name}`,
            duration: "45 min",
            status: idx === 0 ? "completed" : idx === 1 ? "current" : "upcoming",
            explanation: t.explanation || "Planned study session."
          }));
          
          setTodaySchedule(schedule);
        } else {
          setTodaySchedule([]);
        }
      } catch (err) {
        console.error("Error fetching schedule data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedNavbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Adaptive Schedule</h1>
              <p className="text-muted-foreground">Your dynamic study plan that adjusts to your progress.</p>
            </div>
            <WhyBadge 
              explanation="This schedule adapts based on your performance, missed sessions, and available time. It always prioritizes the next best study action." 
            />
          </div>
        </div>

        {/* Week Navigation */}
        <div className="card-elevated p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">January 2024</span>
            </div>
            <Button variant="ghost" size="icon">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const isToday = index === todayIndex;
              const isPast = index < todayIndex;
              
              return (
                <button
                  key={day}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                    isToday 
                      ? "bg-primary text-primary-foreground" 
                      : isPast 
                        ? "bg-muted text-muted-foreground"
                        : "hover:bg-secondary"
                  }`}
                >
                  <span className="text-xs font-medium mb-1">{day}</span>
                  <span className={`text-lg font-bold ${isToday ? "" : isPast ? "text-muted-foreground" : "text-foreground"}`}>
                    {dates[index]}
                  </span>
                  {isPast && (
                    <CheckCircle2 className="w-3 h-3 mt-1 text-risk-low" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
            ) : todaySchedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No schedule generated yet. Add topics to get started.</div>
            ) : (
              <DailyScheduleCard items={todaySchedule} />
            )}

            {/* Adjustment Notice */}
            <div className="card-elevated p-4 mt-6 border-l-4 border-accent">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-accent flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground mb-1">Schedule Adjusted</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Yesterday's missed Electromagnetism session has been rescheduled to today at 3:00 PM. 
                    Organic Chemistry was shortened to accommodate this change.
                  </p>
                  <WhyBadge explanation="Electromagnetism has higher exam weightage. Rescheduling ensures coverage of critical topics before the exam." />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Weekly Progress */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Weekly Overview</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-risk-low" />
                    <span className="text-sm text-muted-foreground">Completed</span>
                  </div>
                  <span className="font-semibold text-foreground">{weeklyStats.completed}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm text-muted-foreground">Upcoming</span>
                  </div>
                  <span className="font-semibold text-foreground">{weeklyStats.upcoming}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-risk-medium" />
                    <span className="text-sm text-muted-foreground">Rescheduled</span>
                  </div>
                  <span className="font-semibold text-foreground">{weeklyStats.missed}</span>
                </div>

                {/* Progress bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{Math.round((weeklyStats.completed / weeklyStats.planned) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full"
                      style={{ width: `${(weeklyStats.completed / weeklyStats.planned) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Time Summary */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Today's Time</h3>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">3h 25m</p>
                  <p className="text-sm text-muted-foreground">Total study time</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessions</span>
                  <span className="font-medium text-foreground">6 sessions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. session</span>
                  <span className="font-medium text-foreground">34 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Breaks included</span>
                  <span className="font-medium text-foreground">45 min</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="card-elevated p-6 bg-gradient-to-br from-accent-soft to-background">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground mb-1">Pro Tip</h4>
                  <p className="text-sm text-muted-foreground">
                    Taking a 5-minute break every 25 minutes improves focus and retention. Your schedule includes these breaks automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SchedulePage;
