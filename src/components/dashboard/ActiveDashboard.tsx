import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict, differenceInDays } from "date-fns";
import { CheckCircle2, Circle, Crown, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  if (!quizData) {
    return [];
  }

  let raw: unknown;

  try {
    raw = typeof quizData === "string" ? JSON.parse(quizData) : quizData;
  } catch {
    return [];
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((question) => ({
      question: String(question?.question ?? ""),
      options: Array.isArray(question?.options) ? question.options.map((option: unknown) => String(option)) : [],
      correct_index: Number(question?.correct_index ?? 0),
      explanation: String(question?.explanation ?? ""),
    }))
    .filter((question) => question.question && question.options.length === 4);
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
          if (!(current.startsWith("- ") || current.startsWith("* "))) {
            break;
          }
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
    <div className="space-y-5 text-slate-100">
      {blocks.map((block, blockIndex) => {
        if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
          const Tag = block.type as "h1" | "h2" | "h3";
          return (
            <Tag key={`${block.type}-${blockIndex}`} className="font-semibold tracking-tight text-white">
              {stripMarkdown(block.value)}
            </Tag>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${blockIndex}`} className="space-y-2">
              {block.items?.map((item) => (
                <li key={item} className="flex gap-3 text-slate-200">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
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
              className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm leading-6 text-cyan-100"
            >
              <code>{block.value}</code>
            </pre>
          );
        }

        return (
          <p key={`p-${blockIndex}`} className="text-[15px] leading-8 text-slate-200">
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
}: ActiveDashboardProps) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<TopicRow | null>(null);
  const [activeTab, setActiveTab] = useState<"study" | "quiz">("study");
  const [quizIndex, setQuizIndex] = useState(0);
  const [feedback, setFeedback] = useState<MasteryFeedback | null>(null);
  const [mastered, setMastered] = useState(false);
  const [quizAttempts, setQuizAttempts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchTopics = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("topics" as never)
        .select("*")
        .eq("user_id", user.id)
        .order("priority_order", { ascending: true });

      if (error) {
        toast.error("Unable to load your roadmap.");
        setTopics([]);
      } else {
        setTopics((data ?? []) as unknown as TopicRow[]);
      }

      setIsLoading(false);
    };

    fetchTopics();
  }, [user]);

  const daysToExam = Math.max(0, differenceInDays(new Date(examDate), new Date()));
  const daysLabel = formatDistanceToNowStrict(new Date(examDate), { addSuffix: true });

  const openTopic = (topic: TopicRow) => {
    setSelectedTopic(topic);
    setActiveTab("study");
    setQuizIndex(0);
    setFeedback(null);
    setMastered(false);
    setQuizAttempts({});
  };

  const closeTopic = () => {
    setSelectedTopic(null);
    setActiveTab("study");
    setQuizIndex(0);
    setFeedback(null);
    setMastered(false);
  };

  const quizQuestions = useMemo(() => parseQuizData(selectedTopic?.quiz_data ?? null), [selectedTopic]);
  const currentQuestion = quizQuestions[quizIndex];
  const shuffledOptions = useMemo(
    () => shuffleOptions(currentQuestion?.options ?? []),
    [currentQuestion],
  );

  const handleAnswer = (optionIndex: number) => {
    if (!currentQuestion || feedback || mastered) {
      return;
    }

    const isCorrect = optionIndex === currentQuestion.correct_index;

    setQuizAttempts((current) => ({
      ...current,
      [quizIndex]: (current[quizIndex] ?? 0) + 1,
    }));

    setFeedback({
      selectedIndex: optionIndex,
      isCorrect,
      explanation: currentQuestion.explanation,
    });
  };

  const handleNext = () => {
    if (!currentQuestion) {
      return;
    }

    if (quizIndex >= quizQuestions.length - 1) {
      setMastered(true);
      setFeedback(null);
      return;
    }

    setQuizIndex((current) => current + 1);
    setFeedback(null);
  };

  const handleRetake = () => {
    setQuizIndex(0);
    setFeedback(null);
    setMastered(false);
  };

  return (
    <>
      <main className="mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_45%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] p-6 shadow-2xl shadow-cyan-950/30 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Roadmap</p>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {daysToExam} days remaining
                </h1>
                <p className="mt-2 max-w-2xl text-base text-slate-300">
                  {examName} • {daysLabel}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Exam name</p>
                <p className="mt-2 text-xl font-semibold text-white">{examName}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Student</p>
                <p className="mt-2 text-xl font-semibold text-white">{userName}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">The Roadmap</h2>
              <p className="mt-1 text-sm text-slate-400">Ordered by marks impact priority and built for deep focus.</p>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 sm:block">
              {topics.length} topics loaded
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
              Loading your roadmap...
            </div>
          ) : topics.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
              No topics found yet. Generate your plan to populate the roadmap.
            </div>
          ) : (
            <div className="space-y-4">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => openTopic(topic)}
                  className="group w-full rounded-[1.75rem] border border-white/10 bg-white/5 p-5 text-left shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-white/8 hover:shadow-cyan-950/20"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                          <Crown className="h-3.5 w-3.5" />
                          Priority {topic.priority_order ?? "-"}
                        </span>
                        <span className="text-sm text-slate-400">{topic.subject}</span>
                      </div>
                      <h3 className="text-2xl font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-100">
                        {topic.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                        +{topic.marks_impact ?? 0} Marks
                      </span>
                      <span className="text-xs uppercase tracking-[0.25em] text-slate-500 transition-colors group-hover:text-slate-300">
                        Open Mastery
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedTopic ? (
        <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-slate-950/95 backdrop-blur-xl">
          <div className="border-b border-white/10 bg-slate-950/80 px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={closeTopic}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Mastery</p>
                  <h2 className="truncate text-xl font-semibold text-white sm:text-2xl">{selectedTopic.name}</h2>
                </div>
              </div>

              <div className="hidden items-center gap-3 sm:flex">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
                  {selectedTopic.subject}
                </span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                  +{selectedTopic.marks_impact ?? 0} Marks
                </span>
              </div>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-5 sm:px-6">
            <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("study")}
                className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${activeTab === "study" ? "bg-white text-slate-950" : "text-slate-300"}`}
              >
                Study
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("quiz")}
                className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${activeTab === "quiz" ? "bg-white text-slate-950" : "text-slate-300"}`}
              >
                Quiz
              </button>
            </div>

            {activeTab === "study" ? (
              <div className="flex-1 rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                  <h3 className="text-lg font-semibold text-white">Mastery Guide</h3>
                </div>
                <div className="max-w-4xl font-[ui-serif] text-base leading-8 text-slate-100 sm:text-lg">
                  <MarkdownRenderer content={selectedTopic.study_content ?? ""} />
                </div>
              </div>
            ) : mastered ? (
              <div className="flex flex-1 items-center justify-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-500/15 via-white/5 to-cyan-500/10 p-8 text-center shadow-2xl shadow-black/20">
                <div className="max-w-xl space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Topic Mastered!</p>
                    <h3 className="text-3xl font-black tracking-tight text-white">{selectedTopic.name}</h3>
                    <p className="text-slate-300">
                      You finished the quiz for {selectedTopic.subject}. The roadmap can move to the next high-impact topic.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button variant="secondary" onClick={handleRetake}>
                      Retry Quiz
                    </Button>
                    <Button onClick={closeTopic}>Back to Roadmap</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 sm:p-8">
                {quizQuestions.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-slate-300">
                    No quiz data is available for this topic yet.
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-6">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>
                        Question {quizIndex + 1} of {quizQuestions.length}
                      </span>
                      <span>{selectedTopic.subject}</span>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 sm:p-8">
                      <h3 className="text-2xl font-semibold tracking-tight text-white">{currentQuestion?.question}</h3>
                      <div className="mt-6 grid gap-3">
                        {shuffledOptions.map((entry) => {
                          const optionIndex = entry.index;
                          const isSelected = feedback?.selectedIndex === optionIndex;
                          const isCorrect = optionIndex === currentQuestion?.correct_index;
                          const hasFeedback = !!feedback;

                          return (
                            <button
                              key={`${quizIndex}-${optionIndex}-${entry.option}`}
                              type="button"
                              onClick={() => handleAnswer(optionIndex)}
                              className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                                hasFeedback
                                  ? isCorrect
                                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-50"
                                    : isSelected
                                      ? "border-rose-400/40 bg-rose-400/10 text-rose-50"
                                      : "border-white/10 bg-white/5 text-slate-300"
                                  : "border-white/10 bg-white/5 text-slate-100 hover:border-cyan-400/40 hover:bg-white/10"
                              }`}
                              disabled={!!feedback}
                            >
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-sm font-semibold">
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span className="flex-1 text-[15px] leading-7">{entry.option}</span>
                              {hasFeedback && isCorrect ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" /> : null}
                              {hasFeedback && isSelected && !isCorrect ? <Circle className="mt-0.5 h-5 w-5 text-rose-300" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {feedback ? (
                      <div className={`rounded-[1.5rem] border p-5 ${feedback.isCorrect ? "border-emerald-400/30 bg-emerald-400/10" : "border-rose-400/30 bg-rose-400/10"}`}>
                        <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${feedback.isCorrect ? "text-emerald-300" : "text-rose-300"}`}>
                          {feedback.isCorrect ? "Correct" : "Incorrect"}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-100">{feedback.explanation}</p>
                        <div className="mt-4 flex justify-end">
                          <Button onClick={handleNext}>
                            {quizIndex === quizQuestions.length - 1 ? "Finish Topic" : "Next Question"}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {!feedback ? (
                      <p className="text-sm text-slate-400">Choose one answer. Feedback appears instantly.</p>
                    ) : null}

                    {quizAttempts[quizIndex] ? (
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        Attempts on this question: {quizAttempts[quizIndex]}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};
