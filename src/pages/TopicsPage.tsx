import { AuthenticatedNavbar } from "@/components/AuthenticatedNavbar";
import { TopicCard } from "@/components/TopicCard";
import { PYQMapping } from "@/components/PYQMapping";
import { EffortMarksChart } from "@/components/EffortMarksChart";
import { WhyBadge } from "@/components/WhyBadge";
import { Button } from "@/components/ui/button";
import { Search, Filter, SortAsc } from "lucide-react";
import { useState } from "react";

const TopicsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const allTopics = [
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
    {
      rank: 4,
      name: "Electromagnetism - Maxwell's Equations",
      importance: 7,
      effort: "high" as const,
      pyqFrequency: 65,
      proficiency: 40,
      explanation: "Complex topic with moderate exam presence. Consider after completing higher priority items.",
    },
    {
      rank: 5,
      name: "Differentiation - Chain Rule & Applications",
      importance: 7,
      effort: "low" as const,
      pyqFrequency: 78,
      proficiency: 80,
      explanation: "You're strong here. Quick 15-min refresh will maintain your edge.",
    },
    {
      rank: 6,
      name: "Inorganic Chemistry - Periodic Trends",
      importance: 6,
      effort: "medium" as const,
      pyqFrequency: 55,
      proficiency: 50,
      explanation: "Moderate importance with predictable question patterns. Good for steady progress.",
    },
    {
      rank: 7,
      name: "Mechanics - Newton's Laws",
      importance: 8,
      effort: "low" as const,
      pyqFrequency: 88,
      proficiency: 75,
      explanation: "Foundation topic you've mastered. Light review recommended.",
    },
    {
      rank: 8,
      name: "Physical Chemistry - Equilibrium",
      importance: 7,
      effort: "medium" as const,
      pyqFrequency: 60,
      proficiency: 55,
      explanation: "Balanced effort-to-marks ratio. Schedule after priority topics.",
    },
  ];

  const pyqData = [
    { topic: "Thermodynamics", appearances: 18, years: ["2024", "2023", "2022", "2021"], trend: "rising" as const, weightage: 15 },
    { topic: "Integration", appearances: 20, years: ["2024", "2023", "2022", "2021"], trend: "stable" as const, weightage: 12 },
    { topic: "Organic Reactions", appearances: 15, years: ["2024", "2023", "2022"], trend: "rising" as const, weightage: 10 },
    { topic: "Electromagnetism", appearances: 12, years: ["2023", "2022", "2021"], trend: "declining" as const, weightage: 8 },
    { topic: "Mechanics", appearances: 19, years: ["2024", "2023", "2022", "2021"], trend: "stable" as const, weightage: 14 },
  ];

  const effortMarksData = [
    { name: "Integration", effort: 2, marks: 9, category: "quick-win" as const },
    { name: "Differentiation", effort: 3, marks: 8, category: "quick-win" as const },
    { name: "Mechanics", effort: 3, marks: 9, category: "quick-win" as const },
    { name: "Thermodynamics", effort: 5, marks: 9, category: "strategic" as const },
    { name: "Electromagnetism", effort: 6, marks: 7, category: "strategic" as const },
    { name: "Physical Chemistry", effort: 5, marks: 6, category: "strategic" as const },
    { name: "Organic Reactions", effort: 8, marks: 6, category: "specialist" as const },
    { name: "Quantum Theory", effort: 9, marks: 5, category: "specialist" as const },
    { name: "Crystal Systems", effort: 7, marks: 3, category: "skip" as const },
    { name: "Nomenclature", effort: 4, marks: 2, category: "skip" as const },
  ];

  const filteredTopics = allTopics.filter(topic => 
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedNavbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Topic Intelligence</h1>
              <p className="text-muted-foreground">Understand what matters most and optimize your study time.</p>
            </div>
            <WhyBadge 
              explanation="Topics are ranked using a combination of PYQ frequency, exam weightage, your current proficiency, and effort required. This ensures you focus on high-impact areas first." 
            />
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="default">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="default">
              <SortAsc className="w-4 h-4 mr-2" />
              Sort
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Topic List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">All Topics ({filteredTopics.length})</h2>
            </div>
            
            <div className="space-y-4">
              {filteredTopics.map((topic, index) => (
                <TopicCard key={index} {...topic} />
              ))}
            </div>
          </div>

          {/* Sidebar - PYQ & Effort/Marks */}
          <div className="space-y-6">
            <PYQMapping data={pyqData} />
            <EffortMarksChart topics={effortMarksData} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default TopicsPage;
