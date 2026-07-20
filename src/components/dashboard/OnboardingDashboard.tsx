import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Calendar as CalendarIcon, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { dashboardStorage } from "@/services/dashboardStorage";
import { DashboardState } from "@/types/dashboard";

interface OnboardingDashboardProps {
  userName: string;
}

const steps = [
  "Exam Details",
  "Subjects",
  "Study Materials",
  "Availability"
];

export const OnboardingDashboard = ({ userName }: OnboardingDashboardProps) => {
  const { user, refreshExamContext, refreshSetupStatus } = useAuth();

  const [step, setStep] = useState(1);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState<Date>();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [studyMaterials, setStudyMaterials] = useState("");
  const [dailyHours, setDailyHours] = useState([4]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);

  const processingTexts = [
    "Analyzing your exam pattern...",
    "Ranking topics by marks impact...",
    "Generating mastery guides...",
    "Building your quiz bank...",
    "Finalizing your AI plan..."
  ];

  const addSubject = () => {
    const subject = newSubject.trim();
    if (subject && !subjects.includes(subject)) {
      setSubjects((prev) => [...prev, subject]);
      setNewSubject("");
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects((prev) => prev.filter((s) => s !== subject));
  };

  const nextStep = () => {
    if (step === 1 && (!examName.trim() || !examDate)) {
      toast.error("Please provide both exam name and date.");
      return;
    }
    if (step === 2) {
      if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
         setSubjects(prev => [...prev, newSubject.trim()]);
         setNewSubject("");
      } else if (subjects.length === 0) {
        toast.error("Please add at least one subject.");
        return;
      }
    }
    setStep((prev) => Math.min(4, prev + 1));
  };

  const prevStep = () => setStep((prev) => Math.max(1, prev - 1));

  const handleSubmit = async () => {
    if (!user || !examDate || subjects.length === 0) return;
    setIsProcessing(true);
    setProcessingStage(0);

    // Cycle through processing stages while the real AI call runs
    let stageIndex = 0;
    const stageTimer = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, processingTexts.length - 1);
      setProcessingStage(stageIndex);
    }, 2500);

    try {
      // 1. Save exam context to Supabase
      const { error: examError } = await supabase.from("exam_contexts").upsert(
        {
          user_id: user.id,
          exam_name: examName.trim(),
          exam_date: format(examDate, "yyyy-MM-dd"),
          subjects,
          daily_study_hours: dailyHours[0],
          study_materials_description: studyMaterials.trim(),
        },
        { onConflict: "user_id" }
      );
      if (examError) throw examError;

      // 2. Seed subject confidence at medium baseline
      const confidenceRows = subjects.map((subject) => ({
        user_id: user.id,
        subject,
        confidence_level: 6,
      }));
      await supabase.from("subject_confidence").upsert(confidenceRows, {
        onConflict: "user_id,subject",
      });

      // 3. Call the AI edge function — generates ranked topics, mastery guides, and quizzes
      const { data, error: fnError } = await supabase.functions.invoke("optimize-study-plan", {
        body: {
          user_id: user.id,
          exam_name: examName.trim(),
          exam_date: format(examDate, "yyyy-MM-dd"),
          subjects,
          study_materials_description: studyMaterials.trim(),
          daily_study_hours: dailyHours[0],
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "Plan generation failed.");

      // 4. Save minimal state to localStorage (topics are loaded from DB on dashboard init)
      const initialState: DashboardState = {
        userId: user.id,
        examName: examName.trim(),
        examDate: format(examDate, "yyyy-MM-dd"),
        subjects,
        dailyStudyHours: dailyHours[0],
        confidenceBySubject: subjects.reduce((acc, subject) => ({ ...acc, [subject]: "medium" }), {}),
        uploads: [],
        topics: [],
        planner: [],
        lastUpdated: new Date().toISOString(),
      };

      dashboardStorage.clearSetupResetRequest(user.id);
      dashboardStorage.save(initialState);
      refreshSetupStatus();
      await refreshExamContext();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate plan. Please try again.");
      setIsProcessing(false);
    } finally {
      clearInterval(stageTimer);
    }
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white overflow-hidden">
        {/* Background radial glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl animate-pulse" />
        </div>

        <div className="relative flex flex-col items-center gap-10 max-w-lg text-center px-8">
          {/* Spinner */}
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-primary/50 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
          </div>

          {/* Stage label */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI is working
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {processingTexts[processingStage]}
            </h2>
            <p className="text-white/40 text-lg">
              Building your personalised high-yield plan for {examName}.
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex gap-2">
            {processingTexts.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-700",
                  i <= processingStage ? "w-6 bg-primary" : "w-2 bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 flex flex-col">
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-6 py-12 md:py-24 justify-center">
        
        {/* Progress Dots */}
        <div className="flex gap-2 mb-12 items-center">
          {steps.map((s, i) => (
            <div 
              key={s} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                step === i + 1 ? "w-8 bg-primary" : step > i + 1 ? "w-4 bg-white/40" : "w-4 bg-white/10"
              )} 
            />
          ))}
        </div>

        <div className="relative min-h-[400px]">
          {/* Step 1: Exam Details */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                What are you <br/> studying for?
              </h1>
              
              <div className="space-y-6 max-w-xl">
                <div>
                  <Input
                    className="h-16 text-2xl bg-transparent border-0 border-b-2 border-white/20 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-white/20"
                    placeholder="e.g. JEE Main, USMLE, SAT..."
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                  />
                </div>
                
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full h-16 text-xl justify-start px-0 border-b-2 border-white/20 rounded-none hover:bg-transparent hover:text-white focus-visible:ring-0",
                          !examDate && "text-white/40"
                        )}
                      >
                        <CalendarIcon className="mr-4 h-6 w-6 opacity-50" />
                        {examDate ? format(examDate, "MMMM do, yyyy") : "When is the exam?"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800 text-white" align="start">
                      <Calendar
                        mode="single"
                        selected={examDate}
                        onSelect={setExamDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Subjects */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                Which subjects <br/> are included?
              </h1>
              
              <div className="space-y-8 max-w-xl">
                <div className="relative">
                  <Input
                    className="h-16 text-2xl bg-transparent border-0 border-b-2 border-white/20 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-white/20 pr-12"
                    placeholder="Type subject and press Enter"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-1/2 -translate-y-1/2 hover:bg-white/10"
                    onClick={addSubject}
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>

                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject}
                        className="animate-in zoom-in inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 border border-white/10 text-lg"
                      >
                        {subject}
                        <button
                          onClick={() => removeSubject(subject)}
                          className="hover:bg-white/10 rounded-full p-1 transition-colors"
                        >
                          <X className="w-4 h-4 text-white/50 hover:text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Study Materials */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                  Your resources
                </h1>
                <p className="text-xl text-white/50">Optional: What books or notes are you using?</p>
              </div>
              
              <div className="max-w-2xl">
                <Textarea
                  className="min-h-[160px] text-xl bg-zinc-900/50 border-white/10 rounded-2xl p-6 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary placeholder:text-white/20 resize-none"
                  placeholder="e.g., NCERT Physics textbook, Allen coaching modules, and my handwritten notes..."
                  value={studyMaterials}
                  onChange={(e) => setStudyMaterials(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4: Daily Hours */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                Availability
              </h1>
              <p className="text-xl text-white/50">How many hours can you dedicate daily?</p>
              
              <div className="max-w-xl py-12">
                <div className="flex items-end gap-4 mb-8">
                  <span className="text-7xl font-bold text-primary tabular-nums tracking-tighter">
                    {dailyHours[0]}
                  </span>
                  <span className="text-2xl text-white/40 pb-2 font-medium">hours / day</span>
                </div>
                
                <Slider
                  value={dailyHours}
                  onValueChange={setDailyHours}
                  max={16}
                  min={1}
                  step={1}
                  className="py-4"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 pt-12 mt-auto border-t border-white/10">
          {step > 1 && (
            <Button 
              variant="ghost" 
              onClick={prevStep}
              className="text-lg px-8 h-14 rounded-full hover:bg-white/5"
            >
              Back
            </Button>
          )}
          
          <Button 
            onClick={step === 4 ? handleSubmit : nextStep}
            className={cn(
              "text-lg px-8 h-14 rounded-full font-medium ml-auto transition-all",
              step === 4 ? "bg-primary hover:bg-primary/90 text-primary-foreground px-12" : "bg-white text-black hover:bg-white/90"
            )}
          >
            {step === 4 ? "Generate My Plan" : "Continue"}
            {step < 4 && <ArrowRight className="ml-2 w-5 h-5" />}
            {step === 4 && <Sparkles className="ml-2 w-5 h-5" />}
          </Button>
        </div>

      </div>
    </div>
  );
};
