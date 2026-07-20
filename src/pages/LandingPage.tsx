import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { PublicNavbar } from "@/components/PublicNavbar";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import {
  ArrowRight,
  Target,
  Sparkles,
  Calendar,
} from "lucide-react";

const LandingPage = () => {
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar onHowItWorksClick={scrollToHowItWorks} />

      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-48 pb-20 px-4 overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0 pattern-dots opacity-50" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        {/* ✅ Content Wrapper (IMPORTANT) */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">


          <h1 className="text-5xl md:text-7xl font-bold mb-12 text-black">
            <span className="hover:text-primary transition-colors duration-300 cursor-default">Know</span>{" "}
            <span className="hover:text-primary transition-colors duration-300 cursor-default">what</span>{" "}
            <span className="hover:text-primary transition-colors duration-300 cursor-default">matters</span>
            <br />
            <span className="hover:text-primary transition-colors duration-300 cursor-default">and</span>{" "}
            <span className="hover:text-primary transition-colors duration-300 cursor-default">why</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            JUMBLE analyzes previous year questions, topic importance, and your
            learning patterns to tell you exactly what to study — and why it matters.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="hero" size="xl">
                Start with AI
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

            <Button variant="outline" size="lg" onClick={scrollToHowItWorks}>
              How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* ================= VALUE PROPOSITION ================= */}
      <section className="py-20 px-4 bg-card">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">

          <div className="text-center p-8 rounded-2xl bg-background border border-border">
            <div className="w-14 h-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4">
              <Target className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">What to Study</h3>
            <p className="text-muted-foreground text-sm">
              Priority-ranked topics based on exam weightage and your current gaps.
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-background border border-border">
            <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Why It Matters</h3>
            <p className="text-muted-foreground text-sm">
              Every recommendation comes with clear reasoning you can trust.
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-background border border-border">
            <div className="w-14 h-14 rounded-2xl bg-risk-low-soft flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-risk-low" />
            </div>
            <h3 className="text-lg font-semibold mb-2">When to Focus</h3>
            <p className="text-muted-foreground text-sm">
              Adaptive daily plans that adjust to your time and progress.
            </p>
          </div>

        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <div ref={howItWorksRef}>
        <HowItWorksSection />
      </div>

      {/* ================= CTA SECTION ================= */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card-elevated p-12 text-center relative overflow-hidden">

            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to study with clarity?
            </h2>

            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join thousands of students who finally know what matters — and why.
            </p>

            <Link to="/register">
              <Button variant="hero" size="xl">
                Start with AI
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;