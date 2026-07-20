import { differenceInDays } from "date-fns";
import { RankedTopic, RiskResult } from "@/types/dashboard";

export const riskService = {
  calculateRisk(examDate: string, rankedTopics: RankedTopic[]): RiskResult {
    const daysRemaining = Math.max(1, differenceInDays(new Date(examDate), new Date()));
    const completedCount = rankedTopics.filter((topic) => topic.suggestedPriority < 20).length;
    const coverage = rankedTopics.length === 0 ? 0 : completedCount / rankedTopics.length;
    const weakHighPriorityCount = rankedTopics.filter(
      (topic) => topic.rank <= 5 && topic.effortScore >= 7,
    ).length;

    const timePressure = Math.min(1, 30 / daysRemaining);
    const coverageRisk = 1 - coverage;
    const weakTopicRisk = Math.min(1, weakHighPriorityCount / 5);

    const score = Math.round((timePressure * 0.35 + coverageRisk * 0.4 + weakTopicRisk * 0.25) * 100);

    const level: RiskResult["level"] = score <= 33 ? "low" : score <= 66 ? "medium" : "high";

    const why =
      level === "low"
        ? "Risk is low because coverage is healthy and time pressure is manageable."
        : level === "medium"
          ? "Risk is medium due to either moderate time pressure or weak high-impact topics."
          : "Risk is high due to limited days left, low coverage, and high-priority weak areas.";

    return {
      score,
      level,
      why,
    };
  },
};
