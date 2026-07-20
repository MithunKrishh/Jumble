import { InsightItem, RankedTopic, RiskResult } from "@/types/dashboard";

export const insightService = {
  buildInsights(topics: RankedTopic[], risk: RiskResult): InsightItem[] {
    const top = topics[0];
    const quickWins = topics.filter((topic) => topic.roi === "high").length;
    const highEffort = topics.filter((topic) => topic.effortScore >= 7).length;

    const items: InsightItem[] = [];

    if (top) {
      items.push({
        id: "top-focus",
        title: "Top focus",
        value: top.topicName,
        why: top.why,
      });
    }

    items.push({
      id: "quick-wins",
      title: "High ROI topics",
      value: `${quickWins}`,
      why: `${quickWins} topics are currently low effort with strong scoring potential.`,
    });

    items.push({
      id: "risk-signal",
      title: "Risk signal",
      value: risk.level.toUpperCase(),
      why: risk.why,
    });

    items.push({
      id: "deep-work",
      title: "Deep-work topics",
      value: `${highEffort}`,
      why: `${highEffort} topics need longer sessions; spread them across the week to avoid burnout.`,
    });

    return items;
  },
};
