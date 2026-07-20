import { RankedTopic, TopicAnalysis } from "@/types/dashboard";
import { analysisService } from "@/services/analysisService";

export const rankingService = {
  rankTopics(topics: TopicAnalysis[]): RankedTopic[] {
    return analysisService.toRankedTopics(topics);
  },

  topPriorities(topics: RankedTopic[], limit = 6): RankedTopic[] {
    return topics.slice(0, limit);
  },
};
