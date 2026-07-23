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
  CheckCircle2,
  BrainCircuit,
  TrendingUp,
  Award,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

const LandingPage = () => {
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500/20">
      <PublicNavbar onHowItWorksClick={scrollToHowItWorks} />

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-24 px-4 overflow-hidden">
        {/* Soft Radial Gradients */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-200/40 via-teal-100/30 to-purple-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-extrabold uppercase tracking-widest shadow-xs"
          >
            <BrainCircuit className="w-4 h-4 text-indigo-600" />
            AI-Powered High-Yield Exam Planner
          </motion.div>

          {/* Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] font-display"
          >
            Know <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500">what matters</span>
            <br />
            and <span className="underline decoration-indigo-300 decoration-wavy decoration-2">why it counts.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            JUMBLE analyzes past year questions, subject weightage, and your confidence gaps to generate a personalized high-yield study plan that guarantees maximum marks gain.
          </motion.p>

          {/* Action CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          >
            <Link to="/register">
              <Button size="lg" className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base shadow-xl shadow-indigo-600/25 gap-2 transition-all hover:scale-[1.02]">
                Create My Study Plan Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <Button variant="outline" size="lg" onClick={scrollToHowItWorks} className="h-14 px-8 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-base">
              See How It Works
            </Button>
          </motion.div>

          {/* Interactive Feature Pills */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-600"
          >
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> PYQ Weightage Algorithm
            </span>
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Interactive Mastery Guides
            </span>
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-teal-500" /> Adaptive Daily Sprints
            </span>
          </motion.div>
        </div>
      </section>

      {/* VALUE PROPOSITION GRID */}
      <section className="py-20 px-4 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
              <Target className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">Target High-Yield Topics</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Every topic is ordered by maximum marks impact based on real PYQ frequency analysis.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-500/5 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mb-6">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">Mastery Guides & Quizzes</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              AI-generated study summaries with formulas, common trap alerts, and 5-question practice quizzes.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">Adaptive Daily Schedule</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Dynamic time blocks that adjust to your available study hours, performance, and exam date.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div ref={howItWorksRef}>
        <HowItWorksSection />
      </div>

      {/* CTA BANNER */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-[2.5rem] bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-12 text-center relative overflow-hidden text-white shadow-2xl shadow-indigo-600/30">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider text-indigo-200">
                <Zap className="w-3.5 h-3.5" /> High-Yield Preparation
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display">
                Ready to study with clarity?
              </h2>

              <p className="text-indigo-100 text-base leading-relaxed">
                Join top scorers who use JUMBLE to cut study friction and focus on what brings maximum marks.
              </p>

              <div className="pt-4">
                <Link to="/register">
                  <Button size="lg" className="h-14 px-10 rounded-2xl bg-white text-indigo-700 hover:bg-slate-100 font-extrabold text-base shadow-xl gap-2">
                    Generate My Plan Now
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;