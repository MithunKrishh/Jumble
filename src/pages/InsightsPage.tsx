import { AuthenticatedNavbar } from "@/components/AuthenticatedNavbar";
import { WhyBadge } from "@/components/WhyBadge";
import { RiskScore } from "@/components/RiskScore";
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

const InsightsPage = () => {
  const insights = [
    {
      type: "positive",
      title: "Calculus is Your Strength",
      description: "Your 80% proficiency in differentiation puts you ahead. A 15-minute revision before exams will secure these marks.",
      action: "Quick Revision",
      actionLink: "/schedule",
      icon: CheckCircle,
      explanation: "Based on your practice test scores and consistent performance in calculus-related topics.",
    },
    {
      type: "warning",
      title: "Thermodynamics Needs Attention",
      description: "This topic carries 15% weightage but your proficiency is only 45%. Prioritizing this can boost your score by 8 marks.",
      action: "Start Learning",
      actionLink: "/schedule",
      icon: AlertTriangle,
      explanation: "High exam weightage (15%) combined with low proficiency (45%) makes this critical.",
    },
    {
      type: "opportunity",
      title: "Quick Win Available",
      description: "Integration techniques are high-frequency with low effort. 2 hours of focused study can secure 12 marks.",
      action: "Grab This Win",
      actionLink: "/topics",
      icon: Lightbulb,
      explanation: "This topic appears in 90% of exams and requires minimal effort based on your current understanding.",
    },
    {
      type: "positive",
      title: "Ahead of Schedule",
      description: "You've completed 50% of topics with 14 days remaining. This pace allows for revision time.",
      action: "View Schedule",
      actionLink: "/schedule",
      icon: TrendingUp,
      explanation: "At current pace, you'll finish core topics with 4 days to spare for revision.",
    },
    {
      type: "warning",
      title: "Organic Chemistry Gap",
      description: "Low proficiency (30%) in a topic that frequently appears. Consider increasing study time allocation.",
      action: "Adjust Plan",
      actionLink: "/schedule",
      icon: TrendingDown,
      explanation: "72% exam frequency with only 30% proficiency creates significant risk.",
    },
  ];

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

  const coverageData = [
    { topic: "Calculus", coverage: 85, status: "strong" },
    { topic: "Mechanics", coverage: 75, status: "good" },
    { topic: "Thermodynamics", coverage: 45, status: "needs-work" },
    { topic: "Electromagnetism", coverage: 40, status: "needs-work" },
    { topic: "Organic Chemistry", coverage: 30, status: "critical" },
    { topic: "Inorganic Chemistry", coverage: 50, status: "good" },
  ];

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
            
            {insights.map((insight, index) => {
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
            {/* Risk Score */}
            <RiskScore score={38} label="Overall Risk" />

            {/* Topic Coverage */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Topic Coverage</h3>
                <WhyBadge explanation="Coverage shows how much of each topic you've studied relative to its exam importance." />
              </div>
              
              <div className="space-y-4">
                {coverageData.map((item, index) => (
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
