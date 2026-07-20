import { DashboardState, TopicAnalysis } from "@/types/dashboard";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromBlob } from "@/services/uploadService";

type AiSource = "endpoint" | "fallback";

interface AiEndpointTopic {
  id: string;
  suggestedPriority?: number;
  why?: string;
  studyMethod?: string;
}

interface AiEndpointResponse {
  topics?: AiEndpointTopic[];
}

interface AiSummaryResponse {
  summary?: string;
}

interface AiQuestionsResponse {
  questions?: string[];
}

interface AiMicroPlanResponse {
  microPlan?: string;
}

const MODEL_NAME = "gpt-5.3-codex";

const getTopicKeywords = (topic: TopicAnalysis): string[] => {
  return topic.topicName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);
};

const isWeakExtraction = (text: string): boolean => {
  const normalized = text.trim().toLowerCase();

  if (!normalized || normalized.length < 140) {
    return true;
  }

  return normalized.includes("content could not be extracted");
};

const getUploadText = async (
  upload: DashboardState["uploads"][number],
): Promise<string> => {
  const current = (upload.extractedText || "").trim();
  if (!isWeakExtraction(current)) {
    return current;
  }

  if (!upload.storagePath) {
    return current;
  }

  const { data, error } = await supabase.storage.from("study-materials").download(upload.storagePath);
  if (error || !data) {
    return current;
  }

  const reparsed = await extractTextFromBlob(data, upload.fileName, upload.contentType);
  return reparsed.trim() || current;
};

const getRelevantExcerpt = (materialContext: string, topic: TopicAnalysis): string => {
  if (!materialContext.trim()) {
    return "";
  }

  const keywords = getTopicKeywords(topic);
  const lines = materialContext
    .split(/[\n.]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 30);

  const scored = lines
    .map((line) => {
      const lower = line.toLowerCase();
      const score = keywords.reduce((acc, keyword) => {
        return lower.includes(keyword) ? acc + 1 : acc;
      }, 0);
      return { line, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.line);

  return scored.join(" ").slice(0, 320);
};

const getMaterialContext = async (state: DashboardState, topic?: TopicAnalysis): Promise<string> => {
  if (state.uploads.length === 0) {
    return "";
  }

  const keywords = topic ? getTopicKeywords(topic) : [];

  const uploadsWithText = await Promise.all(
    state.uploads.map(async (upload) => ({
      upload,
      text: await getUploadText(upload),
    })),
  );

  const scoredUploads = uploadsWithText
    .map(({ upload, text }) => {
      const lower = text.toLowerCase();
      const keywordMatches = keywords.reduce((count, keyword) => {
        return lower.includes(keyword) ? count + 1 : count;
      }, 0);
      const subjectMatch = topic ? lower.includes(topic.subject.toLowerCase()) : false;
      const score = keywordMatches * 2 + (subjectMatch ? 1 : 0);

      return {
        upload,
        text,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const topUploads = scoredUploads.slice(0, 2).map(({ upload }) => upload);

  return topUploads
    .map((upload) => {
      const matched = scoredUploads.find((entry) => entry.upload.id === upload.id);
      const excerpt = (matched?.text || upload.extractedText || "").replace(/\s+/g, " ").trim().slice(0, 1000);
      return `[${upload.fileName}] ${excerpt}`;
    })
    .join("\n\n")
    .slice(0, 2400);
};

const getMaterialSourceLabel = (state: DashboardState): string => {
  if (state.uploads.length === 0) {
    return "general strategy";
  }

  const names = state.uploads.slice(0, 2).map((upload) => upload.fileName);
  return `your uploaded material (${names.join(", ")})`;
};

const getStudyMethod = (topic: TopicAnalysis): string => {
  if (topic.effortScore >= 8) {
    return "Deep concept session + worked examples";
  }

  if (topic.frequencyScore >= 75 && topic.effortScore <= 5) {
    return "Timed PYQ drills + quick revision";
  }

  if (topic.scoringPotential >= 70) {
    return "Concept recap + mixed practice set";
  }

  return "Short revision and spaced recall";
};

const enrichWithMethod = (topics: TopicAnalysis[]): TopicAnalysis[] => {
  return topics.map((topic) => {
    const method = getStudyMethod(topic);
    return {
      ...topic,
      why: `${topic.why} How to do: ${method}.`,
    };
  });
};

const applyEndpointDecisions = (
  baseline: TopicAnalysis[],
  decisions: AiEndpointTopic[],
): TopicAnalysis[] => {
  const decisionMap = new Map(decisions.map((decision) => [decision.id, decision]));

  return baseline.map((topic) => {
    const decision = decisionMap.get(topic.id);
    if (!decision) {
      return topic;
    }

    const suggestedPriority =
      typeof decision.suggestedPriority === "number"
        ? Math.max(1, Math.min(100, Math.round(decision.suggestedPriority)))
        : topic.suggestedPriority;

    const method = decision.studyMethod || getStudyMethod(topic);
    const reason = decision.why?.trim() || topic.why;

    return {
      ...topic,
      suggestedPriority,
      why: `${reason} How to do: ${method}.`,
    };
  });
};

export const aiDecisionService = {
  async decideWhatAndHow(
    state: DashboardState,
    baseline: TopicAnalysis[],
  ): Promise<{ topics: TopicAnalysis[]; source: AiSource }> {
    const endpoint = import.meta.env.VITE_AI_DECISION_ENDPOINT as string | undefined;

    if (!endpoint) {
      return {
        topics: enrichWithMethod(baseline),
        source: "fallback",
      };
    }

    const materialContext = await getMaterialContext(state);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          examName: state.examName,
          examDate: state.examDate,
          dailyStudyHours: state.dailyStudyHours,
          materialContext,
          topics: baseline.map((topic) => ({
            id: topic.id,
            subject: topic.subject,
            topicName: topic.topicName,
            frequencyScore: topic.frequencyScore,
            importanceScore: topic.importanceScore,
            effortScore: topic.effortScore,
            suggestedPriority: topic.suggestedPriority,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI endpoint failed with ${response.status}`);
      }

      const json = (await response.json()) as AiEndpointResponse;
      const decisions = Array.isArray(json.topics) ? json.topics : [];

      if (decisions.length === 0) {
        return {
          topics: enrichWithMethod(baseline),
          source: "fallback",
        };
      }

      return {
        topics: applyEndpointDecisions(baseline, decisions),
        source: "endpoint",
      };
    } catch {
      return {
        topics: enrichWithMethod(baseline),
        source: "fallback",
      };
    }
  },

  async generateTopicSummary(state: DashboardState, topic: TopicAnalysis): Promise<string> {
    const summaryEndpoint = import.meta.env.VITE_AI_SUMMARY_ENDPOINT as string | undefined;
    const materialContext = await getMaterialContext(state, topic);
    const sourceLabel = getMaterialSourceLabel(state);
    const excerpt = getRelevantExcerpt(materialContext, topic);

    if (!summaryEndpoint) {
      return `${topic.topicName} in ${topic.subject}: Based on ${sourceLabel}, start with core definitions and one concept map. Then solve 3 PYQ-style questions from easy to moderate, and finish with a 5-minute self-recall without notes.${excerpt ? ` Key line from your upload: "${excerpt}".` : ""}`;
    }

    try {
      const response = await fetch(summaryEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          examName: state.examName,
          examDate: state.examDate,
          topic: {
            id: topic.id,
            subject: topic.subject,
            topicName: topic.topicName,
            importanceScore: topic.importanceScore,
            difficulty: topic.difficulty,
            scoringPotential: topic.scoringPotential,
            effortScore: topic.effortScore,
            frequencyScore: topic.frequencyScore,
          },
          materialContext,
          instruction:
            "Generate a concise study summary for a student: include concept focus, common mistakes, and a short practice plan.",
        }),
      });

      if (!response.ok) {
        throw new Error(`AI summary endpoint failed with ${response.status}`);
      }

      const data = (await response.json()) as AiSummaryResponse;
      const summary = data.summary?.trim();

      if (!summary) {
        throw new Error("AI summary missing in response");
      }

      return summary;
    } catch {
      return `${topic.topicName}: Using ${sourceLabel}, start with a 15-minute concept recap, write down 5 key points, then solve one foundational and two exam-style problems. End by reviewing mistakes and creating a one-page quick revision note.${excerpt ? ` Anchor your notes around: "${excerpt}".` : ""}`;
    }
  },

  async generateProbableQuestions(state: DashboardState, topic: TopicAnalysis): Promise<string[]> {
    const questionsEndpoint = import.meta.env.VITE_AI_QUESTIONS_ENDPOINT as string | undefined;
    const materialContext = await getMaterialContext(state, topic);
    const sourceLabel = getMaterialSourceLabel(state);
    const excerpt = getRelevantExcerpt(materialContext, topic);
    const excerptTail = excerpt ? ` Use this line from notes: "${excerpt}".` : "";

    if (!questionsEndpoint) {
      return [
        `Using ${sourceLabel}, define the core principle of ${topic.topicName} and explain one real exam application.${excerptTail}`,
        `Solve a medium-level PYQ-style problem from ${topic.topicName} with full steps and one reference from your notes.${excerptTail}`,
        `List two common mistakes students make in ${topic.topicName} and correct them with hints from uploaded content.${excerptTail}`,
        `Compare two related concepts inside ${topic.topicName} with one example each from your material.${excerptTail}`,
        `Write a short revision answer for a 5-mark question on ${topic.topicName} using your uploaded sources.${excerptTail}`,
      ];
    }

    try {
      const response = await fetch(questionsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          examName: state.examName,
          examDate: state.examDate,
          topic: {
            id: topic.id,
            subject: topic.subject,
            topicName: topic.topicName,
            importanceScore: topic.importanceScore,
            difficulty: topic.difficulty,
            frequencyScore: topic.frequencyScore,
          },
          materialContext,
          instruction: "Generate exactly 5 probable exam questions, concise and student-friendly.",
        }),
      });

      if (!response.ok) {
        throw new Error(`AI questions endpoint failed with ${response.status}`);
      }

      const data = (await response.json()) as AiQuestionsResponse;
      const questions = Array.isArray(data.questions)
        ? data.questions.map((q) => q.trim()).filter((q) => q.length > 0)
        : [];

      if (questions.length === 0) {
        throw new Error("AI questions missing in response");
      }

      return questions.slice(0, 5);
    } catch {
      return [
        `What is the main idea behind ${topic.topicName}?`,
        `Explain one high-scoring pattern from ${topic.topicName}.`,
        `Solve one typical problem from ${topic.topicName}.`,
        `What mistakes should be avoided in ${topic.topicName}?`,
        `How would you revise ${topic.topicName} in 10 minutes before exam?`,
      ];
    }
  },

  async generateMicroPlan(state: DashboardState, topic: TopicAnalysis): Promise<string> {
    const microPlanEndpoint = import.meta.env.VITE_AI_MICROPLAN_ENDPOINT as string | undefined;
    const materialContext = await getMaterialContext(state, topic);
    const sourceLabel = getMaterialSourceLabel(state);
    const excerpt = getRelevantExcerpt(materialContext, topic);

    if (!microPlanEndpoint) {
      return `30-minute plan for ${topic.topicName} using ${sourceLabel}: 8 min concept recap from notes, 12 min solved example + one practice question, 7 min exam-style question attempt, 3 min error review and quick notes.${excerpt ? ` Start from this extracted point: "${excerpt}".` : ""}`;
    }

    try {
      const response = await fetch(microPlanEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          examName: state.examName,
          examDate: state.examDate,
          topic: {
            id: topic.id,
            subject: topic.subject,
            topicName: topic.topicName,
            effortScore: topic.effortScore,
            scoringPotential: topic.scoringPotential,
            difficulty: topic.difficulty,
          },
          materialContext,
          instruction:
            "Generate a compact 30-minute micro study plan with minute-by-minute blocks and outcome.",
        }),
      });

      if (!response.ok) {
        throw new Error(`AI micro-plan endpoint failed with ${response.status}`);
      }

      const data = (await response.json()) as AiMicroPlanResponse;
      const microPlan = data.microPlan?.trim();

      if (!microPlan) {
        throw new Error("AI micro plan missing in response");
      }

      return microPlan;
    } catch {
      return `30-minute sprint: 10 min learn the core concept, 12 min solve 2 focused questions, 5 min revise formulas/steps, 3 min write one-page takeaway for ${topic.topicName}.`;
    }
  },
};
