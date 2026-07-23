import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict, differenceInDays, format } from "date-fns";
import { 
  CheckCircle2, 
  Circle, 
  Crown, 
  Sparkles, 
  X, 
  Search, 
  Filter, 
  Calendar, 
  RotateCcw, 
  Upload, 
  FileText, 
  Trash2, 
  Clock, 
  BookOpen, 
  Award,
  Layers,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { dashboardStorage } from "@/services/dashboardStorage";
import { uploadService } from "@/services/uploadService";
import { UploadedMaterial } from "@/types/dashboard";

type QuizQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type TopicRow = {
  id: string;
  name: string;
  subject: string;
  priority_order: number | null;
  marks_impact: number | null;
  study_content: string | null;
  quiz_data: QuizQuestion[] | string | null;
  proficiency: number | null;
  explanation: string | null;
};

type MasteryFeedback = {
  selectedIndex: number;
  isCorrect: boolean;
  explanation: string;
};

interface ActiveDashboardProps {
  userName: string;
  examName: string;
  examDate: string;
  subjects: string[];
}

const parseQuizData = (quizData: TopicRow["quiz_data"]): QuizQuestion[] => {
  if (!quizData) return [];
  let raw: unknown;
  try {
    raw = typeof quizData === "string" ? JSON.parse(quizData) : quizData;
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => ({
      question: String(q?.question ?? ""),
      options: Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o)) : [],
      correct_index: Number(q?.correct_index ?? 0),
      explanation: String(q?.explanation ?? ""),
    }))
    .filter((q) => q.question && q.options.length === 4);
};

const stripMarkdown = (input: string) => input.replace(/\*\*/g, "");

const MarkdownRenderer = ({ content }: { content: string }) => {
  const blocks = useMemo(() => {
    const lines = content.split("\n");
    const nodes: Array<{ type: string; value: string; items?: string[] }> = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        index += 1;
        continue;
      }

      if (trimmed.startsWith("```")) {
        const codeLines: string[] = [];
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith("```")) {
          codeLines.push(lines[index]);
          index += 1;
        }
        nodes.push({ type: "code", value: codeLines.join("\n") });
        index += 1;
        continue;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items: string[] = [];
        while (index < lines.length) {
          const current = lines[index].trim();
          if (!(current.startsWith("- ") || current.startsWith("* "))) break;
          items.push(current.slice(2));
          index += 1;
        }
        nodes.push({ type: "list", value: "", items });
        continue;
      }

      if (/^#{1,3}\s/.test(trimmed)) {
        nodes.push({ type: `h${Math.min(3, trimmed.match(/^#+/)?.[0].length ?? 1)}`, value: trimmed.replace(/^#{1,3}\s/, "") });
        index += 1;
        continue;
      }

      const paragraph: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current || current.startsWith("```") || current.startsWith("- ") || current.startsWith("* ") || /^#{1,3}\s/.test(current)) {
          break;
        }
        paragraph.push(lines[index]);
        index += 1;
      }
      nodes.push({ type: "p", value: paragraph.join(" ") });
    }

    return nodes;
  }, [content]);

  return (
    <div className="space-y-4 text-slate-100">
      {blocks.map((block, blockIndex) => {
        if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
          return (
            <h3 key={`${block.type}-${blockIndex}`} className="font-bold tracking-tight text-white text-xl mt-4">
              {stripMarkdown(block.value)}
            </h3>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${blockIndex}`} className="space-y-2 my-3">
              {block.items?.map((item) => (
                <li key={item} className="flex gap-3 text-slate-200">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  <span>{stripMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={`code-${blockIndex}`}
              className="overflow-x-auto rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-sm leading-6 text-cyan-200 my-4"
            >
              <code>{block.value}</code>
            </pre>
          );
        }

        return (
          <p key={`p-${blockIndex}`} className="text-base leading-7 text-slate-200">
            {stripMarkdown(block.value)}
          </p>
        );
      })}
    </div>
  );
};

const shuffleOptions = (options: string[]) => {
  return options
    .map((option, index) => ({ option, index }))
    .sort(() => Math.random() - 0.5);
};

export const ActiveDashboard = ({
  userName,
  examName,
  examDate,
  subjects,
}: ActiveDashboardProps) => {
  const { user, refreshSetupStatus, refreshExamContext } = useAuth();
  
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Dashboard view state
  const [activeTab, setActiveTab] = useState<"roadmap" | "schedule" | "materials">("roadmap");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "mastered">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Topic detail modal state
  const [selectedTopic, setSelectedTopic] = useState<TopicRow | null>(null);
  const [drawerTab, setDrawerTab] = useState<"study" | "quiz">("study");
  const [quizIndex, setQuizIndex] = useState(0);
  const [feedback, setFeedback] = useState<MasteryFeedback | null>(null);
  const [quizMastered, setQuizMastered] = useState(false);
  
  // Material upload state
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchTopics = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("topics" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("priority_order", { ascending: true });

      if (error) {
        toast.error("Unable to load study plan topics.");
        setTopics([]);
      } else {
        const loadedTopics = (data ?? []) as unknown as TopicRow[];
        setTopics(loadedTopics);
        
        // Track mastered topics based on proficiency >= 100
        const mastered = new Set(
          loadedTopics.filter((t) => (t.proficiency ?? 0) >= 100).map((t) => t.id)
        );
        setMasteredIds(mastered);
      }

      // Load stored local state for uploads
      const savedState = dashboardStorage.load(user.id);
      if (savedState?.uploads) {
        setUploadedMaterials(savedState.uploads);
      }

      setIsLoading(false);
    };

    fetchTopics();
  }, [user]);

  const daysToExam = Math.max(0, differenceInDays(new Date(examDate), new Date()));
  const daysLabel = formatDistanceToNowStrict(new Date(examDate), { addSuffix: true });

  const totalMarks = useMemo(() => {
    return topics.reduce((acc, t) => acc + (t.marks_impact ?? 0), 0);
  }, [topics]);

  const masteredMarks = useMemo(() => {
    return topics
      .filter((t) => masteredIds.has(t.id))
      .reduce((acc, t) => acc + (t.marks_impact ?? 0), 0);
  }, [topics, masteredIds]);

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesSubject = selectedSubject === "all" || t.subject.toLowerCase() === selectedSubject.toLowerCase();
      const isMastered = masteredIds.has(t.id);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "mastered" && isMastered) ||
        (statusFilter === "pending" && !isMastered);
      const matchesQuery =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSubject && matchesStatus && matchesQuery;
    });
  }, [topics, selectedSubject, statusFilter, searchQuery, masteredIds]);

  const handleToggleMastered = async (topicId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isMastered = masteredIds.has(topicId);
    const newProficiency = isMastered ? 30 : 100;

    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (isMastered) next.delete(topicId);
      else next.add(topicId);
      return next;
    });

    if (user) {
      await supabase
        .from("topics" as any)
        .update({ proficiency: newProficiency })
        .eq("id", topicId)
        .eq("user_id", user.id);
    }

    toast.success(isMastered ? "Topic marked as pending." : "Topic marked as Mastered! 🎉");
  };

  const handleResetPlan = () => {
    if (!user) return;
    if (confirm("Are you sure you want to edit your setup / re-create your study plan?")) {
      dashboardStorage.requestSetupReset(user.id);
      refreshSetupStatus();
      refreshExamContext();
    }
  };

  const openTopic = (topic: TopicRow) => {
    setSelectedTopic(topic);
    setDrawerTab("study");
    setQuizIndex(0);
    setFeedback(null);
    setQuizMastered(false);
  };

  const closeTopic = () => {
    setSelectedTopic(null);
    setDrawerTab("study");
    setQuizIndex(0);
    setFeedback(null);
    setQuizMastered(false);
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

      // Save to local storage state
      const existing = dashboardStorage.load(user.id);
      if (existing) {
        dashboardStorage.save({
          ...existing,
          uploads: [...uploadedMaterials, ...Array.from(files).map((f) => ({
            id: Date.now().toString(),
            kind: f.name.toLowerCase().includes("pyq") ? "pyq" : "notes" as const,
            fileName: f.name,
            contentType: f.type,
            extractedText: "",
            createdAt: new Date().toISOString()
          }))]
        });
      }

      toast.success(`${files.length} document(s) uploaded.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const quizQuestions = useMemo(() => parseQuizData(selectedTopic?.quiz_data ?? null), [selectedTopic]);
  const currentQuestion = quizQuestions[quizIndex];
  const shuffledOptions = useMemo(
    () => shuffleOptions(currentQuestion?.options ?? []),
    [currentQuestion],
  );

  const handleAnswer = (optionIndex: number) => {
    if (!currentQuestion || feedback || quizMastered) return;
    const isCorrect = optionIndex === currentQuestion.correct_index;
    setFeedback({
      selectedIndex: optionIndex,
      isCorrect,
      explanation: currentQuestion.explanation,
    });
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;
    if (quizIndex >= quizQuestions.length - 1) {
      setQuizMastered(true);
      setFeedback(null);
      if (selectedTopic) {
        handleToggleMastered(selectedTopic.id);
      }
      return;
    }
    setQuizIndex((prev) => prev + 1);
    setFeedback(null);
  };

  // Generate today's schedule items from top topics
  const todayScheduleItems = useMemo(() => {
    return topics.slice(0, 5).map((t, idx) => ({
      id: t.id,
      time: `${9 + idx * 2}:00 AM`,
      duration: "45 min",
      topic: `${t.subject} — ${t.name}`,
      marks: t.marks_impact ?? 0,
      isMastered: masteredIds.has(t.id),
      rawTopic: t
    }));
  }, [topics, masteredIds]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        
        {/* Top Header Card */}
        <section className="rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 sm:p-10 shadow-2xl shadow-cyan-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
          
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" /> AI Study Plan Active
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                {daysToExam} Days Remaining
              </h1>
              <p className="text-slate-400 text-base max-w-xl">
                Targeting <span className="text-white font-semibold">{examName}</span> • Exam on {format(new Date(examDate), "MMMM do, yyyy")} ({daysLabel}).
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Progress</p>
                <p className="mt-1 text-2xl font-black text-cyan-400 tabular-nums">
                  {topics.length > 0 ? Math.round((masteredIds.size / topics.length) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-400">{masteredIds.size} of {topics.length} Mastered</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Marks Secured</p>
                <p className="mt-1 text-2xl font-black text-emerald-400 tabular-nums">
                  +{masteredMarks} / {totalMarks}
                </p>
                <p className="text-xs text-slate-400">High-yield weightage</p>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md flex flex-col justify-between">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Plan Management</p>
                <Button
                  onClick={handleResetPlan}
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:text-white rounded-xl gap-1.5 w-full font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset / Edit Setup
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Dashboard Navigation Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 p-1.5">
            <button
              onClick={() => setActiveTab("roadmap")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === "roadmap"
                  ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Crown className="h-4 w-4" />
              High-Yield Roadmap ({topics.length})
            </button>

            <button
              onClick={() => setActiveTab("schedule")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === "schedule"
                  ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Today's Schedule
            </button>

            <button
              onClick={() => setActiveTab("materials")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === "materials"
                  ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="h-4 w-4" />
              Materials & PYQs ({uploadedMaterials.length})
            </button>
          </div>

          <Button
            onClick={handleResetPlan}
            variant="ghost"
            className="text-xs text-slate-400 hover:text-cyan-400 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Re-create Plan
          </Button>
        </div>

        {/* TAB 1: ROADMAP & TOPICS */}
        {activeTab === "roadmap" && (
          <section className="mt-6 space-y-6">
            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-950/60 p-4 rounded-2xl border border-white/10">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search topics or subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-zinc-900 border-white/10 text-white rounded-xl focus-visible:ring-1 focus-visible:ring-cyan-400"
                />
              </div>

              {/* Subject filter dropdown */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <button
                  onClick={() => setSelectedSubject("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    selectedSubject === "all"
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  All Subjects
                </button>
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      selectedSubject.toLowerCase() === sub.toLowerCase()
                        ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <div className="flex rounded-xl bg-zinc-900 p-1 border border-white/10 shrink-0">
                {(["all", "pending", "mastered"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold capitalize rounded-lg transition ${
                      statusFilter === st ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic List */}
            {isLoading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-400">
                Loading your personalized roadmap...
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-400">
                No topics match your current filters. Try resetting search or filters.
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTopics.map((topic) => {
                  const isMastered = masteredIds.has(topic.id);
                  return (
                    <div
                      key={topic.id}
                      onClick={() => openTopic(topic)}
                      className={`group cursor-pointer rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-0.5 ${
                        isMastered
                          ? "border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50"
                          : "border-white/10 bg-zinc-900/60 hover:border-cyan-400/40 hover:bg-zinc-900/90"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
                              <Crown className="h-3 w-3" /> Priority {topic.priority_order ?? "-"}
                            </span>
                            <span className="text-xs font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                              {topic.subject}
                            </span>
                            {isMastered && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mastered
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-cyan-300">
                            {topic.name}
                          </h3>

                          {topic.explanation && (
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {topic.explanation}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                          <div className="text-right">
                            <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-300">
                              +{topic.marks_impact ?? 0} Marks
                            </span>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant={isMastered ? "secondary" : "outline"}
                            onClick={(e) => handleToggleMastered(topic.id, e)}
                            className="rounded-xl text-xs gap-1.5 border-white/10 hover:border-cyan-400"
                          >
                            {isMastered ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Done
                              </>
                            ) : (
                              <>
                                <Circle className="h-4 w-4 text-slate-400" /> Mark Mastered
                              </>
                            )}
                          </Button>

                          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-cyan-300 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: TODAY'S ADAPTIVE SCHEDULE */}
        {activeTab === "schedule" && (
          <section className="mt-6 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Today's Focus Plan</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Adaptive daily study blocks prioritized by exam weightage and your available study hours.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold">
                  <Clock className="h-3.5 w-3.5" /> High-Impact Sessions
                </div>
              </div>

              <div className="space-y-3">
                {todayScheduleItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      item.isMastered
                        ? "border-emerald-500/30 bg-emerald-950/20 opacity-75"
                        : "border-white/10 bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-300 text-sm shrink-0">
                        #{index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{item.time}</span>
                          <span>•</span>
                          <span>{item.duration}</span>
                        </div>
                        <h4 className="font-bold text-white text-base mt-0.5">{item.topic}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                        +{item.marks} Marks
                      </span>
                      <Button
                        size="sm"
                        onClick={() => openTopic(item.rawTopic)}
                        className="bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 rounded-xl text-xs"
                      >
                        Study Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: MATERIALS & PYQS */}
        {activeTab === "materials" && (
          <section className="mt-6 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Uploaded Study Materials & PYQs</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Upload syllabus copies, notes, or PYQ papers to keep topic scoring aligned with your exact exam.
                </p>
              </div>

              {/* Upload Dropzone */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 hover:border-cyan-400/50 rounded-2xl p-6 bg-zinc-900/50 cursor-pointer transition">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Upload className="h-8 w-8 text-cyan-400 mb-2" />
                <p className="font-bold text-white text-base">
                  {isUploading ? "Extracting document..." : "Click to upload additional PYQ PDFs or Notes"}
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT supported</p>
              </label>

              {/* List of uploaded materials */}
              {uploadedMaterials.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No uploaded materials attached yet.</p>
              ) : (
                <div className="space-y-2">
                  {uploadedMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-white/10 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-cyan-400" />
                        <div>
                          <p className="font-bold text-white">{mat.fileName}</p>
                          <p className="text-xs text-slate-400">
                            Attached {format(new Date(mat.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/10 text-cyan-300">
                        {mat.kind}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* TOPIC MASTERY DRAWER / MODAL */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
          {/* Drawer Header */}
          <div className="border-b border-white/10 bg-zinc-950/90 px-6 py-4">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={closeTopic}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">
                      Topic Mastery Guide
                    </span>
                    <span className="text-xs text-slate-400">• {selectedTopic.subject}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedTopic.name}</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleToggleMastered(selectedTopic.id)}
                  variant={masteredIds.has(selectedTopic.id) ? "secondary" : "default"}
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {masteredIds.has(selectedTopic.id) ? "Mastered" : "Mark as Mastered"}
                </Button>
              </div>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6 overflow-y-auto">
            {/* Drawer Tab Switcher */}
            <div className="flex gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerTab("study")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  drawerTab === "study" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
                }`}
              >
                High-Yield Study Guide
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("quiz")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  drawerTab === "quiz" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
                }`}
              >
                Practice Quiz ({quizQuestions.length} Questions)
              </button>
            </div>

            {/* TAB: STUDY GUIDE */}
            {drawerTab === "study" && (
              <div className="flex-1 rounded-3xl border border-white/10 bg-zinc-900/80 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="text-lg font-bold text-white">Mastery Guide & Key Notes</h3>
                </div>

                <div className="max-w-4xl">
                  <MarkdownRenderer content={selectedTopic.study_content ?? "No guide content available for this topic."} />
                </div>
              </div>
            )}

            {/* TAB: QUIZ */}
            {drawerTab === "quiz" && (
              <div className="flex-1 rounded-3xl border border-white/10 bg-zinc-900/80 p-6 sm:p-8 space-y-6">
                {quizMastered ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Quiz Completed!</h3>
                    <p className="text-slate-400 text-sm max-w-md">
                      Great job reviewing questions for {selectedTopic.name}. Topic proficiency has been updated.
                    </p>
                    <Button onClick={closeTopic} className="bg-cyan-400 text-slate-950 font-bold rounded-xl mt-4">
                      Return to Roadmap
                    </Button>
                  </div>
                ) : quizQuestions.length === 0 ? (
                  <div className="text-center text-slate-400 py-12">
                    No quiz questions generated for this topic yet.
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Question {quizIndex + 1} of {quizQuestions.length}</span>
                      <span>{selectedTopic.subject}</span>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 space-y-6">
                      <h4 className="text-lg font-bold text-white">{currentQuestion?.question}</h4>

                      <div className="grid gap-3">
                        {shuffledOptions.map((entry) => {
                          const optionIndex = entry.index;
                          const isSelected = feedback?.selectedIndex === optionIndex;
                          const isCorrect = optionIndex === currentQuestion?.correct_index;
                          const hasFeedback = !!feedback;

                          return (
                            <button
                              key={`${quizIndex}-${optionIndex}`}
                              type="button"
                              onClick={() => handleAnswer(optionIndex)}
                              disabled={hasFeedback}
                              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                                hasFeedback
                                  ? isCorrect
                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                                    : isSelected
                                    ? "border-rose-500/50 bg-rose-500/10 text-rose-100"
                                    : "border-white/10 bg-white/5 text-slate-400"
                                  : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/50 hover:bg-white/10"
                              }`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/30 text-xs font-bold">
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span className="flex-1 text-sm font-medium">{entry.option}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {feedback && (
                      <div className={`p-4 rounded-2xl border ${feedback.isCorrect ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider ${feedback.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                          {feedback.isCorrect ? "Correct Answer!" : "Incorrect"}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-slate-200">{feedback.explanation}</p>
                        <div className="mt-3 flex justify-end">
                          <Button onClick={handleNextQuestion} className="bg-white text-slate-950 font-bold rounded-xl text-xs">
                            {quizIndex === quizQuestions.length - 1 ? "Finish Quiz" : "Next Question"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
