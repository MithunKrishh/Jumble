import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Loader2, 
  Plus, 
  Sparkles, 
  X, 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  HelpCircle,
  Gauge,
  BookOpen
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { dashboardStorage } from "@/services/dashboardStorage";
import { DashboardState, ConfidenceLevel, UploadedMaterial } from "@/types/dashboard";
import { uploadService } from "@/services/uploadService";
import { generateFallbackStudyPlan } from "@/services/planGenerator";

interface OnboardingDashboardProps {
  userName: string;
}

const EXAM_PRESETS = [
  "JEE Main / Advanced",
  "NEET UG",
  "USMLE Step 1",
  "SAT / ACT",
  "UPSC CSE",
  "GRE / GMAT",
  "GATE",
  "AP Examinations",
];

const steps = [
  "Exam Details",
  "Subjects & Mastery",
  "Materials & PYQs",
  "Availability"
];

export const OnboardingDashboard = ({ userName }: OnboardingDashboardProps) => {
  const { user, refreshExamContext, refreshSetupStatus } = useAuth();

  const [step, setStep] = useState(1);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState<Date>();
  const [targetGoal, setTargetGoal] = useState("");
  
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [subjectConfidence, setSubjectConfidence] = useState<Record<string, ConfidenceLevel>>({});

  const [studyMaterials, setStudyMaterials] = useState("");
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [dailyHours, setDailyHours] = useState([4]);
  const [sessionDuration, setSessionDuration] = useState("45");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);

  const processingTexts = [
    "Analyzing exam weightage pattern...",
    "Evaluating subject confidence baselines...",
    "Processing uploaded study materials & PYQs...",
    "Ranking topics by maximum marks impact...",
    "Generating interactive guides & quiz bank...",
    "Finalizing your AI study plan..."
  ];

  const addSubject = (nameToAdd?: string) => {
    const subject = (nameToAdd || newSubject).trim();
    if (subject && !subjects.includes(subject)) {
      setSubjects((prev) => [...prev, subject]);
      setSubjectConfidence((prev) => ({ ...prev, [subject]: "medium" }));
      if (!nameToAdd) setNewSubject("");
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects((prev) => prev.filter((s) => s !== subject));
    setSubjectConfidence((prev) => {
      const next = { ...prev };
      delete next[subject];
      return next;
    });
  };

  const setConfidenceForSubject = (subject: string, level: ConfidenceLevel) => {
    setSubjectConfidence((prev) => ({ ...prev, [subject]: level }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const kind = file.name.toLowerCase().includes("pyq") ? "pyq" : "notes";
        const material = await uploadService.toMaterial(user.id, file, kind);
        setUploadedMaterials((prev) => [...prev, material]);
      }
      toast.success(`${files.length} file(s) attached successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to process uploaded file.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeUploadedMaterial = (id: string) => {
    setUploadedMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const nextStep = () => {
    if (step === 1 && (!examName.trim() || !examDate)) {
      toast.error("Please specify your exam name and target date.");
      return;
    }
    if (step === 2) {
      if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
        addSubject(newSubject.trim());
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

    let stageIndex = 0;
    const stageTimer = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, processingTexts.length - 1);
      setProcessingStage(stageIndex);
    }, 2200);

    try {
      // 1. Save exam context to Supabase
      const combinedMaterials = [
        studyMaterials.trim(),
        uploadedMaterials.length > 0
          ? `Attached Materials:\n` + uploadedMaterials.map((m) => `- ${m.fileName} (${m.kind.toUpperCase()})`).join("\n")
          : ""
      ].filter(Boolean).join("\n\n");

      const { error: examError } = await supabase.from("exam_contexts").upsert(
        {
          user_id: user.id,
          exam_name: examName.trim(),
          exam_date: format(examDate, "yyyy-MM-dd"),
          subjects,
          daily_study_hours: dailyHours[0],
          study_materials_description: combinedMaterials,
        },
        { onConflict: "user_id" }
      );
      if (examError) throw examError;

      // 2. Save subject confidence ratings
      const confidenceRows = subjects.map((subject) => {
        const lvl = subjectConfidence[subject] || "medium";
        const numericLvl = lvl === "low" ? 3 : lvl === "high" ? 9 : 6;
        return {
          user_id: user.id,
          subject,
          confidence_level: numericLvl,
        };
      });

      await supabase.from("subject_confidence").upsert(confidenceRows, {
        onConflict: "user_id,subject",
      });

      // 3. Invoke Edge Function for AI plan generation with Authorization header
      let planGenerated = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const { data, error: fnError } = await supabase.functions.invoke("optimize-study-plan", {
          headers,
          body: {
            user_id: user.id,
            exam_name: examName.trim(),
            exam_date: format(examDate, "yyyy-MM-dd"),
            subjects,
            study_materials_description: combinedMaterials,
            daily_study_hours: dailyHours[0],
          },
        });

        if (!fnError && data?.success) {
          planGenerated = true;
        } else {
          console.warn("Edge function invocation returned non-success, using client plan fallback:", fnError?.message || data?.error);
        }
      } catch (err) {
        console.warn("Edge function network error, using client plan fallback:", err);
      }

      // If Edge Function failed or was unreachable, run reliable client-side plan generator
      if (!planGenerated) {
        await generateFallbackStudyPlan(user.id, subjects, examName.trim());
      }

      // 4. Save local state
      const initialState: DashboardState = {
        userId: user.id,
        examName: examName.trim(),
        examDate: format(examDate, "yyyy-MM-dd"),
        subjects,
        dailyStudyHours: dailyHours[0],
        confidenceBySubject: subjectConfidence,
        uploads: uploadedMaterials,
        topics: [],
        planner: [],
        lastUpdated: new Date().toISOString(),
      };

      dashboardStorage.clearSetupResetRequest(user.id);
      dashboardStorage.save(initialState);
      refreshSetupStatus();
      await refreshExamContext();
      toast.success("Study Plan generated successfully!");
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
        </div>

        <div className="relative flex flex-col items-center gap-10 max-w-lg text-center px-8">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-cyan-300/50 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-sm font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI Architect is synthesizing
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {processingTexts[processingStage]}
            </h2>
            <p className="text-white/40 text-base">
              Crafting your high-yield roadmap for <span className="text-white font-medium">{examName}</span>.
            </p>
          </div>

          <div className="flex gap-2">
            {processingTexts.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-700",
                  i <= processingStage ? "w-6 bg-cyan-400" : "w-2 bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 flex flex-col">
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-6 py-10 md:py-16 justify-center">
        
        {/* Progress Tracker Bar */}
        <div className="mb-10 space-y-2">
          <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Step {step} of 4: {steps[step - 1]}</span>
            <span>{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <div className="flex gap-2 items-center">
            {steps.map((s, i) => (
              <div 
                key={s} 
                className={cn(
                  "h-2 rounded-full transition-all duration-500 flex-1",
                  step === i + 1 ? "bg-cyan-400" : step > i + 1 ? "bg-cyan-400/50" : "bg-white/10"
                )} 
              />
            ))}
          </div>
        </div>

        <div className="relative min-h-[420px]">
          {/* Step 1: Exam Details & Presets */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  What exam are you <br/><span className="text-cyan-400">preparing for?</span>
                </h1>
                <p className="mt-3 text-slate-400 text-base">
                  Specify your target exam and date so AI can compute topic marks weightage.
                </p>
              </div>
              
              <div className="space-y-6 max-w-xl">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                    Target Exam
                  </label>
                  <Input
                    className="h-14 text-xl bg-zinc-900/60 border border-white/10 rounded-2xl px-5 focus-visible:ring-1 focus-visible:ring-cyan-400 placeholder:text-white/20"
                    placeholder="e.g. JEE Main, USMLE Step 1, SAT..."
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                  />
                  
                  {/* Presets */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500 self-center mr-1">Presets:</span>
                    {EXAM_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setExamName(preset)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                          examName === preset 
                            ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                      Exam Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full h-14 text-base justify-start px-4 bg-zinc-900/60 border border-white/10 rounded-2xl hover:bg-zinc-900 hover:text-white focus-visible:ring-1 focus-visible:ring-cyan-400",
                            !examDate && "text-white/40"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-5 w-5 opacity-60 text-cyan-400" />
                          {examDate ? format(examDate, "MMM do, yyyy") : "Select Date"}
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

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                      Target Score / Rank (Optional)
                    </label>
                    <Input
                      className="h-14 text-base bg-zinc-900/60 border border-white/10 rounded-2xl px-4 focus-visible:ring-1 focus-visible:ring-cyan-400 placeholder:text-white/20"
                      placeholder="e.g., Top 1000, 99 percentile"
                      value={targetGoal}
                      onChange={(e) => setTargetGoal(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Subjects & Confidence Ratings */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Which subjects are in your <br/><span className="text-cyan-400">syllabus?</span>
                </h1>
                <p className="mt-3 text-slate-400 text-base">
                  Add subjects and rate your current confidence so we prioritize weaker areas.
                </p>
              </div>
              
              <div className="space-y-6 max-w-xl">
                <div className="relative flex gap-2">
                  <Input
                    className="h-14 text-lg bg-zinc-900/60 border border-white/10 rounded-2xl px-5 focus-visible:ring-1 focus-visible:ring-cyan-400 placeholder:text-white/20"
                    placeholder="Add subject (e.g. Physics, Biochemistry)"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  />
                  <Button 
                    type="button"
                    onClick={() => addSubject()}
                    className="h-14 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                  >
                    <Plus className="w-5 h-5 mr-1" /> Add
                  </Button>
                </div>

                {subjects.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                      Subjects & Your Confidence Baseline
                    </label>
                    <div className="space-y-2">
                      {subjects.map((subject) => {
                        const currentConf = subjectConfidence[subject] || "medium";
                        return (
                          <div
                            key={subject}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-white/10"
                          >
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-5 h-5 text-cyan-400" />
                              <span className="font-semibold text-lg text-white">{subject}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 mr-1">Confidence:</span>
                              {(["low", "medium", "high"] as const).map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => setConfidenceForSubject(subject, level)}
                                  className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-semibold capitalize border transition-all",
                                    currentConf === level
                                      ? level === "low"
                                        ? "bg-rose-500/20 border-rose-500 text-rose-300"
                                        : level === "medium"
                                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                        : "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                                  )}
                                >
                                  {level}
                                </button>
                              ))}

                              <button
                                onClick={() => removeSubject(subject)}
                                className="ml-2 hover:bg-white/10 rounded-lg p-1.5 transition-colors text-slate-400 hover:text-white"
                                title="Remove Subject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Study Materials & PYQs */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Study materials & <br/><span className="text-cyan-400">Past Year Papers</span>
                </h1>
                <p className="mt-3 text-slate-400 text-base">
                  Upload syllabus documents, notes, or PYQ PDFs to tailor topic priority to your exact exam pattern.
                </p>
              </div>
              
              <div className="space-y-6 max-w-2xl">
                {/* File Upload Dropzone */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                    Attach Documents / Notes / PYQ PDFs
                  </label>
                  <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-white/20 hover:border-cyan-400/50 rounded-2xl p-6 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all cursor-pointer group">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6 text-cyan-400" />
                        )}
                      </div>
                      <p className="font-semibold text-white text-base">
                        {isUploading ? "Extracting & analyzing..." : "Click or drag & drop files here"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Supports PDF, DOCX, TXT (PYQ sets, coaching notes, syllabus outlines)
                      </p>
                    </div>
                  </label>

                  {/* Uploaded materials list */}
                  {uploadedMaterials.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedMaterials.map((mat) => (
                        <div
                          key={mat.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/10 text-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="truncate font-medium text-slate-200">{mat.fileName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-white/10 text-cyan-300">
                              {mat.kind}
                            </span>
                          </div>
                          <button
                            onClick={() => removeUploadedMaterial(mat.id)}
                            className="text-slate-400 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Text Notes Description */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                    Or Describe Your Textbooks & Notes
                  </label>
                  <Textarea
                    className="min-h-[120px] text-base bg-zinc-900/60 border-white/10 rounded-2xl p-4 focus-visible:ring-1 focus-visible:ring-cyan-400 placeholder:text-white/20 resize-none"
                    placeholder="e.g., NCERT textbooks, HC Verma Physics, coaching modules, handwritten class notes..."
                    value={studyMaterials}
                    onChange={(e) => setStudyMaterials(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Availability & Preferences */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Daily Study <br/><span className="text-cyan-400">Availability</span>
                </h1>
                <p className="mt-3 text-slate-400 text-base">
                  How many hours can you dedicate each day to follow this study plan?
                </p>
              </div>
              
              <div className="max-w-xl py-6 space-y-8">
                <div className="p-6 rounded-3xl bg-zinc-900/80 border border-white/10 space-y-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Daily Study Target</span>
                      <span className="text-6xl font-black text-cyan-400 tracking-tight tabular-nums">
                        {dailyHours[0]}
                      </span>
                      <span className="text-xl text-slate-300 font-medium ml-2">hours / day</span>
                    </div>
                    <Gauge className="w-10 h-10 text-cyan-400/40" />
                  </div>
                  
                  <Slider
                    value={dailyHours}
                    onValueChange={setDailyHours}
                    max={16}
                    min={1}
                    step={1}
                    className="py-2"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Preferred Session Pace</span>
                    <select
                      value={sessionDuration}
                      onChange={(e) => setSessionDuration(e.target.value)}
                      className="w-full h-11 bg-zinc-900 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="30">30 min focused sprints</option>
                      <option value="45">45 min standard sessions</option>
                      <option value="60">60 min deep dives</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/10 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                    <p className="text-xs text-slate-300">
                      AI will automatically insert 5-10 minute rest breaks between topics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center gap-4 pt-8 mt-auto border-t border-white/10">
          {step > 1 && (
            <Button 
              variant="ghost" 
              onClick={prevStep}
              className="text-base px-6 h-12 rounded-2xl hover:bg-white/5 text-slate-300"
            >
              Back
            </Button>
          )}
          
          <Button 
            onClick={step === 4 ? handleSubmit : nextStep}
            className={cn(
              "text-base px-8 h-12 rounded-2xl font-bold ml-auto transition-all gap-2",
              step === 4 
                ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-10 shadow-lg shadow-cyan-500/25" 
                : "bg-white text-slate-950 hover:bg-slate-200"
            )}
          >
            {step === 4 ? "Generate My Study Plan" : "Continue"}
            {step < 4 && <ArrowRight className="w-4 h-4" />}
            {step === 4 && <Sparkles className="w-4 h-4" />}
          </Button>
        </div>

      </div>
    </div>
  );
};
