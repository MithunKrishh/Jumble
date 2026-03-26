import { RiskScore } from "@/components/RiskScore";
import { TopicCard } from "@/components/TopicCard";
import { DailyScheduleCard } from "@/components/DailyScheduleCard";
import { EffortMarksChart } from "@/components/EffortMarksChart";
import { WhyBadge } from "@/components/WhyBadge";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Clock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInDays } from "date-fns";

interface ActiveDashboardProps {
  userName: string;
  examName: string;
  examDate: string;
  subjects: string[];
}

export const ActiveDashboard = ({ 
  userName, 
  examName, 
  examDate,
  subjects 
}: ActiveDashboardProps) => {
  // Calculate days to exam
  const daysToExam = Math.max(0, differenceInDays(new Date(examDate), new Date()));

  // Mock data - in a real app, this would come from the database
  const priorityTopics = [
    {
      rank: 1,
      name: "Thermodynamics - Laws & Applications",
      importance: 9,
      effort: "medium" as const,
      pyqFrequency: 85,
      proficiency: 45,
      explanation: "This topic appears in 85% of exams and carries 15% weightage. Your current proficiency is below average, making it critical to focus on.",
    },
    {
      rank: 2,
      name: "Organic Chemistry - Reaction Mechanisms",
      importance: 8,
      effort: "high" as const,
      pyqFrequency: 72,
      proficiency: 30,
      explanation: "High exam frequency with significant marks allocation. Your low proficiency makes this a priority despite high effort required.",
    },
    {
      rank: 3,
      name: "Calculus - Integration Techniques",
      importance: 8,
      effort: "low" as const,
      pyqFrequency: 90,
      proficiency: 70,
      explanation: "Quick win! You're already proficient and a short revision will secure these marks with minimal effort.",
    },
  ];

  const scheduleItems = [
    {
      id: "1",
      time: "9:00 AM",
      topic: "Thermodynamics - First Law",
      duration: "45 min",
      status: "completed" as const,
      explanation: "Foundation concepts covered successfully.",
    },
    {
      id: "2",
      time: "10:00 AM",
      topic: "Thermodynamics - Practice Problems",
      duration: "30 min",
      status: "current" as const,
      explanation: "Applying concepts strengthens retention by 40%.",
    },
    {
      id: "3",
      time: "11:00 AM",
      topic: "Calculus - Quick Revision",
      duration: "20 min",
      status: "upcoming" as const,
      explanation: "Light review to maintain proficiency.",
    },
    {
      id: "4",
      time: "2:00 PM",
      topic: "Organic Chemistry - Basics",
      duration: "45 min",
      status: "upcoming" as const,
      explanation: "Starting with foundational concepts.",
    },
  ];

  const effortMarksData = [
    { name: "Integration", effort: 2, marks: 9, category: "quick-win" as const },
    { name: "Differentiation", effort: 3, marks: 8, category: "quick-win" as const },
    { name: "Thermodynamics", effort: 5, marks: 9, category: "strategic" as const },
    { name: "Electromagnetism", effort: 6, marks: 7, category: "strategic" as const },
    { name: "Organic Reactions", effort: 8, marks: 6, category: "specialist" as const },
    { name: "Quantum Theory", effort: 9, marks: 5, category: "specialist" as const },
    { name: "Crystal Systems", effort: 7, marks: 3, category: "skip" as const },
    { name: "Nomenclature", effort: 4, marks: 2, category: "skip" as const },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome, {userName}</h1>
        <p className="text-muted-foreground">
          Preparing for {examName} — here's your intelligent study overview.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <RiskScore score={38} showExplanation={true} />
        
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Days to Exam</span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground">{daysToExam}</p>
          <p className="text-sm text-muted-foreground mt-1">Time is valuable</p>
        </div>
        
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Subjects</span>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground">{subjects.length}</p>
          <p className="text-sm text-muted-foreground mt-1 truncate" title={subjects.join(", ")}>
            {subjects.slice(0, 2).join(", ")}{subjects.length > 2 ? "..." : ""}
          </p>
        </div>
        
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Today's Progress</span>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground">1<span className="text-lg text-muted-foreground">/4</span></p>
          <p className="text-sm text-risk-low mt-1">On track</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Priority Topics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Priority Topics</h2>
              <p className="text-sm text-muted-foreground">Ranked by impact on your exam score</p>
            </div>
            <Link to="/topics">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {priorityTopics.map((topic, index) => (
              <TopicCard key={index} {...topic} />
            ))}
          </div>

          {/* Effort vs Marks */}
          <EffortMarksChart topics={effortMarksData} />
        </div>

        {/* Right Column - Schedule & Insights */}
        <div className="space-y-6">
          <DailyScheduleCard items={scheduleItems} />

          {/* Quick Insight Card */}
          <div className="card-elevated p-6 bg-gradient-to-br from-primary-soft to-background">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Smart Insight</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Focusing on Thermodynamics this week can improve your predicted score by 8 marks.
                </p>
                <WhyBadge explanation="Based on topic weightage (15%), your current gap (55%), and available study time." />
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-4">Upcoming Milestones</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-muted-foreground flex-1">Complete Thermodynamics</span>
                <span className="font-medium text-foreground">3 days</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground flex-1">Mock Test 1</span>
                <span className="font-medium text-foreground">7 days</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-risk-medium" />
                <span className="text-muted-foreground flex-1">{examName}</span>
                <span className="font-medium text-foreground">{daysToExam} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
