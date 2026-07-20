import {
  ConfidenceLevel,
  DashboardState,
  DifficultyLevel,
  RankedTopic,
  TopicAnalysis,
  TopicInput,
} from "@/types/dashboard";
import { aiDecisionService } from "@/services/aiDecisionService";

const fallbackTopicCatalog: Record<string, string[]> = {
  Physics: ["Thermodynamics", "Electrostatics", "Kinematics", "Current Electricity"],
  Chemistry: ["Organic Reactions", "Chemical Bonding", "Thermochemistry", "Equilibrium"],
  Mathematics: ["Integration", "Differentiation", "Probability", "Vectors"],
  Biology: ["Genetics", "Human Physiology", "Ecology", "Plant Morphology"],
};

const keywordImportance = [
  { keyword: "thermo", boost: 12 },
  { keyword: "integration", boost: 10 },
  { keyword: "reaction", boost: 9 },
  { keyword: "calculus", boost: 8 },
  { keyword: "mechanics", boost: 7 },
  { keyword: "probability", boost: 6 },
];

const getConfidenceWeight = (confidence: ConfidenceLevel): number => {
  if (confidence === "low") {
    return 1.2;
  }

  if (confidence === "high") {
    return 0.85;
  }

  return 1;
};

const scoreToDifficulty = (score: number): DifficultyLevel => {
  if (score <= 4) {
    return "easy";
  }

  if (score <= 7) {
    return "medium";
  }

  return "hard";
};

const detectImportanceBoost = (topicName: string, materialText: string): number => {
  const text = `${topicName} ${materialText}`.toLowerCase();

  return keywordImportance.reduce((total, rule) => {
    return text.includes(rule.keyword) ? total + rule.boost : total;
  }, 0);
};

const createFallbackTopics = (subjects: string[]): TopicInput[] => {
  return subjects.flatMap((subject) => {
    const defaults =
      fallbackTopicCatalog[subject] || [
        `${subject} Fundamentals`,
        `${subject} Applications`,
        `${subject} Problem Solving`,
      ];

    return defaults.map((topicName, index) => ({
      id: `${subject}-${topicName}-${index}`,
      subject,
      topicName,
      completed: false,
      proficiency: 45,
    }));
  });
};

const materialCorpus = (state: DashboardState): string => {
  return state.uploads.map((upload) => upload.extractedText).join(" ").slice(0, 15000);
};

const toTopicAnalysis = (topic: TopicInput, state: DashboardState, corpus: string): TopicAnalysis => {
  const confidence = state.confidenceBySubject[topic.subject] || "medium";
  const confidenceWeight = getConfidenceWeight(confidence);
  const baseImportance = Math.max(30, Math.min(90, 40 + topic.proficiency / 2));
  const frequencyScore = Math.max(20, Math.min(100, 100 - topic.proficiency + (state.uploads.length > 0 ? 12 : 0)));
  const importanceBoost = detectImportanceBoost(topic.topicName, corpus);
  const importanceScore = Math.max(35, Math.min(100, baseImportance + importanceBoost));

  const effortScore = Math.max(
    1,
    Math.min(10, Math.round(((100 - topic.proficiency) / 12) * confidenceWeight + 1)),
  );
  const difficulty = scoreToDifficulty(effortScore);
  const scoringPotential = Math.max(20, Math.min(100, Math.round((importanceScore * 0.7 + frequencyScore * 0.3))));
  const suggestedPriority = Math.max(1, Math.min(100, Math.round(scoringPotential - effortScore * 4 + (topic.completed ? -15 : 10))));

  const materialSignal =
    state.uploads.length > 0
      ? "your uploaded material and PYQ signals"
      : "fallback internet-style trend priors due to limited uploads";

  return {
    id: topic.id,
    subject: topic.subject,
    topicName: topic.topicName,
    frequencyScore,
    importanceScore,
    difficulty,
    scoringPotential,
    effortScore,
    suggestedPriority,
    why: `${topic.topicName} is prioritized using ${materialSignal}, your ${confidence} confidence in ${topic.subject}, and current proficiency (${topic.proficiency}%).`,
  };
};

export const analysisService = {
  analyzeTopics(state: DashboardState): TopicAnalysis[] {
    const seededTopics = state.topics.length > 0 ? state.topics : createFallbackTopics(state.subjects);
    const corpus = materialCorpus(state);
    return seededTopics.map((topic) => toTopicAnalysis(topic, state, corpus));
  },

  ensureTopics(state: DashboardState): DashboardState {
    if (state.topics.length > 0) {
      return state;
    }

    return {
      ...state,
      topics: createFallbackTopics(state.subjects),
    };
  },

  toRankedTopics(analysis: TopicAnalysis[]): RankedTopic[] {
    return analysis
      .slice()
      .sort((a, b) => b.suggestedPriority - a.suggestedPriority)
      .map((topic, index) => {
        const roiScore = topic.scoringPotential - topic.effortScore * 7;
        const roi = roiScore >= 35 ? "high" : roiScore >= 15 ? "medium" : "low";

        return {
          ...topic,
          rank: index + 1,
          roi,
        };
      });
  },

  async analyzeTopicsWithAI(state: DashboardState): Promise<{ topics: TopicAnalysis[]; source: "endpoint" | "fallback" }> {
    const baseline = this.analyzeTopics(state);
    return aiDecisionService.decideWhatAndHow(state, baseline);
  },
};
