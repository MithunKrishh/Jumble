import { supabase } from "@/integrations/supabase/client";

export interface FallbackTopicInput {
  name: string;
  subject: string;
  priority_order: number;
  marks_impact: number;
  importance: number;
  effort: "low" | "medium" | "high";
  pyq_frequency: number;
  proficiency: number;
  explanation: string;
  study_content: string;
  quiz_data: Array<{
    question: string;
    options: [string, string, string, string];
    correct_index: 0 | 1 | 2 | 3;
    explanation: string;
  }>;
}

const subjectCatalog: Record<string, Array<{ name: string; effort: "low" | "medium" | "high"; impact: number }>> = {
  Physics: [
    { name: "Thermodynamics & Heat Transfer", effort: "high", impact: 9 },
    { name: "Electrostatics & Capacitance", effort: "high", impact: 8 },
    { name: "Current Electricity & Circuits", effort: "medium", impact: 9 },
    { name: "Kinematics & Newton's Laws", effort: "medium", impact: 7 },
    { name: "Ray & Wave Optics", effort: "high", impact: 8 },
    { name: "Modern Physics & Atomic Structure", effort: "low", impact: 10 },
  ],
  Chemistry: [
    { name: "Organic Reaction Mechanisms", effort: "high", impact: 10 },
    { name: "Chemical Bonding & Molecular Structure", effort: "medium", impact: 9 },
    { name: "Chemical Equilibrium & Kinetics", effort: "medium", impact: 8 },
    { name: "Coordination Compounds", effort: "low", impact: 8 },
    { name: "Electrochemistry & Solutions", effort: "medium", impact: 7 },
    { name: "Periodic Table & Periodic Properties", effort: "low", impact: 7 },
  ],
  Mathematics: [
    { name: "Integration & Definite Integrals", effort: "high", impact: 10 },
    { name: "Differential Calculus & Derivatives", effort: "high", impact: 9 },
    { name: "Vectors & 3D Geometry", effort: "medium", impact: 9 },
    { name: "Matrices & Determinants", effort: "low", impact: 8 },
    { name: "Probability & Permutations", effort: "medium", impact: 7 },
    { name: "Coordinate Geometry & Conic Sections", effort: "high", impact: 8 },
  ],
  Biology: [
    { name: "Genetics & Molecular Basis of Inheritance", effort: "high", impact: 10 },
    { name: "Human Physiology & Circulation", effort: "high", impact: 9 },
    { name: "Plant Physiology & Photosynthesis", effort: "medium", impact: 8 },
    { name: "Ecology & Environment", effort: "low", impact: 8 },
    { name: "Cell Structure & Cell Cycle", effort: "medium", impact: 7 },
    { name: "Biotechnology & Applications", effort: "low", impact: 8 },
  ],
};

const buildTopicGuide = (topicName: string, subject: string): string => {
  return `## High-Yield Mastery Guide: ${topicName}

### 1. Core Principles & Overview
Mastering **${topicName}** in **${subject}** is critical for scoring top marks in your exam. Focus on understanding key definitions, standard conventions, and foundational mathematical or conceptual relationships.

### 2. Essential Formulas & Key Concepts
- **Core Definition**: Understand the primary physical or analytical mechanism governing ${topicName}.
- **Primary Formula**: $E = f(x)$ — Ensure correct unit conversions before solving.
- **Key Shortcut**: Look out for symmetry and standard boundary conditions to eliminate incorrect options rapidly.

### 3. Common Traps to Avoid
- **Unit Conversion Errors**: Always convert inputs to standard SI units before applying formulas.
- **Sign Conventions**: Double check positive/negative direction standards.
- **Overlooking Assumptions**: Verify whether ideal conditions apply before applying simplified equations.

### 4. Quick Revision Check
1. Can you write down the 3 primary equations for ${topicName} from memory?
2. Solve 2 previous year questions without looking at hints.
3. Review core formulas 15 minutes before your practice quiz.`;
};

const buildTopicQuiz = (topicName: string, subject: string) => {
  return [
    {
      question: `Which of the following best describes the core principle of ${topicName} in ${subject}?`,
      options: [
        `It governs the fundamental relationship between key variables under standard conditions.`,
        `It only applies when external forces or parameters are set to absolute zero.`,
        `It represents an empirical approximation used exclusively for qualitative estimations.`,
        `It is restricted to non-interactive closed systems with fixed mass.`,
      ] as [string, string, string, string],
      correct_index: 0 as const,
      explanation: `The core principle of ${topicName} provides the primary governing equation under standard boundary conditions.`,
    },
    {
      question: `What is a common error students make when solving questions on ${topicName}?`,
      options: [
        `Ignoring sign conventions and unit conversions`,
        `Using standard SI units throughout calculation`,
        `Applying conservation laws strictly`,
        `Checking dimensional consistency before finalizing choice`,
      ] as [string, string, string, string],
      correct_index: 0 as const,
      explanation: `Failing to check unit conversions and sign conventions is the most frequent trap in ${topicName} problems.`,
    },
    {
      question: `How does increasing the primary input factor affect the overall outcome in ${topicName}?`,
      options: [
        `It increases proportionally according to the governing relationship.`,
        `It drops to zero instantaneously regardless of context.`,
        `It remains completely unchanged under all configurations.`,
        `It exhibits random non-deterministic fluctuations.`,
      ] as [string, string, string, string],
      correct_index: 0 as const,
      explanation: `Direct proportionality is the characteristic response derived from the governing equations of ${topicName}.`,
    },
    {
      question: `Which strategy is most effective for solving PYQ numericals on ${topicName}?`,
      options: [
        `Identify given values, write standard formula, convert units, and solve step-by-step.`,
        `Guess choice based on answer length alone.`,
        `Skip unit conversions and compute approximate value.`,
        `Assume all variable values equal unity.`,
      ] as [string, string, string, string],
      correct_index: 0 as const,
      explanation: `Structured problem solving—identifying givens, converting units, and applying the formula—yields 100% accuracy.`,
    },
    {
      question: `What is the final key takeaway when revising ${topicName}?`,
      options: [
        `Master foundational definitions, memorize key formulas, and practice past year questions.`,
        `Rely solely on intuition without reviewing formulas.`,
        `Memorize answers without understanding steps.`,
        `Avoid practicing practice questions until exam day.`,
      ] as [string, string, string, string],
      correct_index: 0 as const,
      explanation: `Combining concept mastery with formula recall and PYQ practice ensures high score returns.`,
    },
  ];
};

export const generateFallbackStudyPlan = async (
  userId: string,
  subjects: string[],
  examName: string
): Promise<number> => {
  let globalPriority = 1;
  const topicRows: any[] = [];

  subjects.forEach((subject) => {
    const predefined = subjectCatalog[subject] || [
      { name: `${subject} Fundamentals & Core Theories`, effort: "medium" as const, impact: 9 },
      { name: `${subject} High-Yield Applications`, effort: "high" as const, impact: 8 },
      { name: `${subject} PYQ Trend Topics & Problem Solving`, effort: "medium" as const, impact: 9 },
      { name: `${subject} Formulae & Rapid Revision Set`, effort: "low" as const, impact: 10 },
    ];

    predefined.forEach((t) => {
      topicRows.push({
        user_id: userId,
        name: t.name,
        subject,
        priority_order: globalPriority,
        marks_impact: t.impact,
        importance: Math.min(10, Math.max(1, t.impact)),
        effort: t.effort,
        pyq_frequency: 8,
        proficiency: 30,
        explanation: `High-yield topic for ${examName} prioritized by marks weightage and past exam frequency.`,
        rank: globalPriority,
        study_content: buildTopicGuide(t.name, subject),
        quiz_data: buildTopicQuiz(t.name, subject),
      });
      globalPriority++;
    });
  });

  // Clear existing topics for this user first
  await supabase.from("topics" as any).delete().eq("user_id", userId);

  // Insert generated topic rows
  const { error } = await supabase.from("topics" as any).insert(topicRows);
  if (error) {
    throw new Error(`Failed to save fallback topics: ${error.message}`);
  }

  return topicRows.length;
};
