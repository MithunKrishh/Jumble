export type DifficultyLevel = "easy" | "medium" | "hard";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface UploadedMaterial {
  id: string;
  kind: "pyq" | "notes";
  fileName: string;
  contentType: string;
  extractedText: string;
  createdAt: string;
  storagePath?: string;
}

export interface TopicInput {
  id: string;
  subject: string;
  topicName: string;
  completed: boolean;
  proficiency: number;
}

export interface TopicAnalysis {
  id: string;
  subject: string;
  topicName: string;
  frequencyScore: number;
  importanceScore: number;
  difficulty: DifficultyLevel;
  scoringPotential: number;
  effortScore: number;
  suggestedPriority: number;
  why: string;
}

export interface RankedTopic extends TopicAnalysis {
  rank: number;
  roi: "high" | "medium" | "low";
}

export interface PlannerItem {
  id: string;
  topicId: string;
  topicName: string;
  subject: string;
  time: string;
  durationMinutes: number;
  status: "completed" | "current" | "upcoming";
  why: string;
}

export interface DashboardState {
  userId: string;
  examName: string;
  examDate: string;
  subjects: string[];
  dailyStudyHours: number;
  confidenceBySubject: Record<string, ConfidenceLevel>;
  uploads: UploadedMaterial[];
  topics: TopicInput[];
  planner: PlannerItem[];
  lastUpdated: string;
}

export interface RiskResult {
  score: number;
  level: "low" | "medium" | "high";
  why: string;
}

export interface InsightItem {
  id: string;
  title: string;
  value: string;
  why: string;
}
