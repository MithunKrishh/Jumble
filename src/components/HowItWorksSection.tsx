import { 
  Target, 
  TrendingUp, 
  ListOrdered, 
  Calendar, 
  Gauge, 
  Lightbulb 
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "PYQ → Topic Importance Scoring",
    description: "We analyze previous year questions to calculate how frequently each topic appears and its weightage. You see clear importance indicators, not raw numbers.",
    color: "primary",
  },
  {
    icon: TrendingUp,
    title: "Effort vs Marks Optimization",
    description: "Compare how much effort a topic needs against how many marks it's worth. We highlight high-return topics so you get maximum results with minimum effort.",
    color: "accent",
  },
  {
    icon: ListOrdered,
    title: "Topic Priority Ranking",
    description: "Your topics are ranked based on importance, difficulty, and your current proficiency. Rankings are explainable and you can adjust them based on your preferences.",
    color: "primary",
  },
  {
    icon: Calendar,
    title: "Adaptive Daily Schedule",
    description: "Get a dynamically generated daily study plan that adjusts based on missed tasks, your performance, and available time. Focus on the next best action, not rigid calendars.",
    color: "accent",
  },
  {
    icon: Gauge,
    title: "Academic Risk Score",
    description: "A single, easy-to-understand indicator showing your exam readiness. Influenced by topic coverage gaps, time remaining, and topic importance. Informative, never alarming.",
    color: "primary",
  },
  {
    icon: Lightbulb,
    title: "Explainable 'WHY' for Everything",
    description: "Every recommendation includes a short explanation: why this topic is prioritized, why this schedule was generated. You always understand the reasoning.",
    color: "accent",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary text-sm font-medium mb-4">
            <Lightbulb className="w-4 h-4" />
            How It Works
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Intelligence behind your study plan
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            JUMBLE uses data-driven insights to help you make smarter study decisions. Here's how each feature works.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="relative p-8 rounded-2xl bg-background border border-border hover:border-primary/20 transition-all duration-300 group"
            >
              {/* Step number */}
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
              </div>

              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                feature.color === "primary" ? "bg-primary-soft" : "bg-accent-soft"
              }`}>
                <feature.icon className={`w-7 h-7 ${
                  feature.color === "primary" ? "text-primary" : "text-accent"
                }`} />
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
