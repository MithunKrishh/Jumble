import { AuthenticatedNavbar } from "@/components/AuthenticatedNavbar";
import { WhyBadge } from "@/components/WhyBadge";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown,
  Target,
  Clock,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const InsightsPage = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [coverageData, setCoverageData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: topicsData, error: topicsError } = await supabase
          .from("topics" as any)
          .select("*");
        
        if (topicsError) throw topicsError;

        const { data: perfData, error: perfError } = await supabase
          .from("user_performance" as any)
          .select("*");

        if (perfError) throw perfError;

        if (perfData) {
          const formattedCoverage = (perfData as any[]).map(p => ({
            topic: p.topic_name,
            coverage: p.coverage_percentage,
            status: p.status
          }));
          setCoverageData(formattedCoverage);
        }
        
        if (topicsData && topicsData.length > 0) {
          const dynamicInsights = (topicsData as any[]).slice(0, 5).map(t => ({
            type: t.effort === "low" ? "opportunity" : t.proficiency > 70 ? "positive" : "warning",
            title: `${t.name} Insight`,
            description: t.explanation || "Review this topic based on your current proficiency.",
            action: t.proficiency < 50 ? "Start Learning" : "Quick Revision",
            actionLink: "/schedule",
            icon: t.proficiency > 70 ? CheckCircle : t.effort === "low" ? Lightbulb : AlertTriangle,
            explanation: `Based on your proficiency of ${t.proficiency}%.`
          }));
          setInsights(dynamicInsights);
        } else {
          setInsights([]);
        }
      } catch (error) {
        console.error("Error fetching insights data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "positive":
        return "border-l-risk-low bg-risk-low-soft/30";
      case "warning":
        return "border-l-risk-medium bg-risk-medium-soft/30";
      case "opportunity":
        return "border-l-primary bg-primary-soft/30";
      default:
        return "border-l-muted bg-muted/30";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "positive":
        return "text-risk-low";
      case "warning":
        return "text-risk-medium";
      case "opportunity":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  const getCoverageColor = (status: string) => {
    switch (status) {
      case "strong":
        return "bg-risk-low";
      case "good":
        return "bg-primary";
      case "needs-work":
        return "bg-risk-medium";
      case "critical":
        return "bg-risk-high";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedNavbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Insights & Explanations</h1>
              <p className="text-muted-foreground">Every recommendation explained — no black box logic.</p>
            </div>
            <WhyBadge 
              explanation="All insights are generated from your performance data, exam patterns, and topic weightage. We believe in transparent recommendations." 
            />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Insights List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Personalized Insights</h2>
            
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading insights...</div>
            ) : insights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No insights generated yet. Add topics to get started.</div>
            ) : insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div 
                  key={index}
                  className={`card-elevated p-6 border-l-4 ${getTypeStyles(insight.type)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      insight.type === "positive" ? "bg-risk-low/10" :
                      insight.type === "warning" ? "bg-risk-medium/10" :
                      "bg-primary/10"
                    }`}>
                      <Icon className={`w-5 h-5 ${getIconColor(insight.type)}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{insight.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                        </div>
                        <WhyBadge explanation={insight.explanation} />
                      </div>
                      
                      <Link to={insight.actionLink}>
                        <Button variant="soft" size="sm">
                          {insight.action}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Topic Coverage */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Topic Coverage</h3>
                <WhyBadge explanation="Coverage shows how much of each topic you've studied relative to its exam importance." />
              </div>
              
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading coverage...</div>
                ) : coverageData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No coverage data available.</div>
                ) : coverageData.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.topic}</span>
                      <span className="font-medium text-foreground">{item.coverage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${getCoverageColor(item.status)}`}
                        style={{ width: `${item.coverage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Predicted Score</p>
                    <p className="font-semibold text-foreground">72-78 marks</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Study Time (This Week)</p>
                    <p className="font-semibold text-foreground">18h 30m</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-risk-low-soft flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-risk-low" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Topics Mastered</p>
                    <p className="font-semibold text-foreground">4 of 24</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Recommendation */}
            <div className="card-elevated p-6 bg-gradient-to-br from-primary-soft to-background">
              <h3 className="font-semibold text-foreground mb-2">Today's Focus</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Spend 2 hours on Thermodynamics today. This single action can improve your predicted score by 5 marks.
              </p>
              <Link to="/schedule">
                <Button variant="default" size="sm">
                  Start Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InsightsPage;
