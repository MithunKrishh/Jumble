import { PlannerItem, RankedTopic } from "@/types/dashboard";

const startHour = 7;

const formatTime = (totalMinutes: number): string => {
  const hour24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
};

export const plannerService = {
  generateDailyPlan(topics: RankedTopic[], studyHours: number, existingPlan: PlannerItem[] = []): PlannerItem[] {
    if (topics.length === 0) {
      return [];
    }

    const totalMinutes = Math.max(60, Math.round(studyHours * 60));
    const slotCount = Math.max(2, Math.min(6, Math.floor(totalMinutes / 40)));
    const slotDuration = Math.max(25, Math.floor(totalMinutes / slotCount));

    const prioritized = topics.filter((topic) => topic.suggestedPriority > 10).slice(0, slotCount);
    const fallback = prioritized.length > 0 ? prioritized : topics.slice(0, slotCount);

    const completedIds = new Set(
      existingPlan.filter((plan) => plan.status === "completed").map((plan) => plan.topicId),
    );

    return fallback.map((topic, index) => {
      const minuteOffset = startHour * 60 + index * slotDuration;
      const status = completedIds.has(topic.id)
        ? "completed"
        : index === 0
          ? "current"
          : "upcoming";

      return {
        id: `${topic.id}-${index}`,
        topicId: topic.id,
        topicName: topic.topicName,
        subject: topic.subject,
        time: formatTime(minuteOffset),
        durationMinutes: slotDuration,
        status,
        why: `Scheduled by priority rank #${topic.rank}, expected marks gain ${topic.scoringPotential}/100, and effort ${topic.effortScore}/10.`,
      };
    });
  },

  markTaskCompleted(plan: PlannerItem[], taskId: string): PlannerItem[] {
    return plan.map((item) => {
      if (item.id === taskId) {
        return { ...item, status: "completed" };
      }

      return item;
    });
  },
};
