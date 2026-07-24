// Supabase Edge Function: optimize-study-plan
// Calls OpenRouter to generate a high-yield study plan,
// then saves all topics (with Mastery Guides + MCQ quizzes) to the topics table.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
  explanation: string;
}

interface TopicFromLLM {
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
  quiz_data: QuizQuestion[];
}

// ---------------------------------------------------------------------------
// Build the OpenRouter prompt
// ---------------------------------------------------------------------------
function buildPrompt(
  examName: string,
  examDate: string,
  subjects: string[],
  studyMaterials: string,
  dailyHours: number
): string {
  return `You are an elite exam preparation strategist specializing in high-yield study plans.

MISSION: Generate a complete syllabus for "${examName}" (exam date: ${examDate}).
Subjects to cover: ${subjects.join(", ")}.
Daily study availability: ${dailyHours} hours/day.
Student's resources: ${studyMaterials || "Not specified"}.

HIGH YIELD PRINCIPLE: Rank every topic by "Maximum Marks Impact" — topics that:
1. Appear most frequently in past exams (high PYQ frequency)
2. Carry the highest marks weight
3. Can be mastered in the least time

Generate 5-8 topics per subject, ordered globally by marks impact (priority_order 1 = most impactful overall).

For each topic you MUST provide:
- A concise "Mastery Guide" in Markdown (study_content): ~200 words with ## headers, bullet points, key formulas/concepts, and a "Quick Revision" summary at the end.
- Exactly 5 Multiple Choice Questions (quiz_data): each with a question, 4 options, the correct_index (0-3), and an explanation.

Respond ONLY with a valid JSON object. No markdown fences. No text outside the JSON.

{
  "topics": [
    {
      "name": "string — specific topic name",
      "subject": "string — must match one of the input subjects exactly",
      "priority_order": "integer — global rank, 1 = highest marks impact",
      "marks_impact": "integer 1-10 — how many marks this topic is worth across past exams",
      "importance": "integer 1-10",
      "effort": "low | medium | high — time needed to master",
      "pyq_frequency": "integer 1-10 — how often it appears in past year questions",
      "proficiency": 30,
      "explanation": "string — one sentence: why this topic is high yield",
      "study_content": "string — markdown mastery guide",
      "quiz_data": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correct_index": 0,
          "explanation": "string — why this answer is correct"
        }
      ]
    }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      user_id,
      exam_name,
      exam_date,
      subjects,
      study_materials_description,
      daily_study_hours,
    } = body;

    // Validate required inputs
    if (!user_id || !exam_name || !exam_date || !Array.isArray(subjects) || subjects.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, exam_name, exam_date, subjects" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      console.error("[optimize-study-plan] OPENROUTER_API_KEY secret is not configured.");
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY secret is not configured on this Supabase project." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------------------------------------------
    // Call OpenRouter with a free model
    // ---------------------------------------------------------------------------
    const prompt = buildPrompt(
      exam_name,
      exam_date,
      subjects,
      study_materials_description ?? "",
      daily_study_hours ?? 4
    );

    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "",
        "X-Title": "JUMBLE",
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free",
        messages: [
          {
            role: "system",
            content:
              "You are an expert exam preparation strategist. Respond only with valid JSON. No markdown fences, no explanation outside the JSON object.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 16000,
      }),
    });

    if (!openrouterRes.ok) {
      const errText = await openrouterRes.text();
      const errMsg = `OpenRouter API error (${openrouterRes.status}): ${errText}`;
      console.error("[optimize-study-plan] OpenRouter API error:", errMsg);
      throw new Error(errMsg);
    }

    const openrouterData = await openrouterRes.json();
    console.log("[optimize-study-plan] OpenRouter response structure:", JSON.stringify({
      choices: openrouterData.choices,
      usage: openrouterData.usage,
      model: openrouterData.model,
    }));
    const rawContent: string | undefined = openrouterData.choices?.[0]?.message?.content;

    if (!rawContent) {
      const emptyMsg = `OpenRouter returned an empty response. Full response: ${JSON.stringify(openrouterData).slice(0, 500)}`;
      console.error("[optimize-study-plan]", emptyMsg);
      throw new Error(emptyMsg);
    }

    // ---------------------------------------------------------------------------
    // Parse and validate LLM output
    // ---------------------------------------------------------------------------
    let parsed: { topics: TopicFromLLM[] };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error("LLM response was not valid JSON. Raw: " + rawContent.slice(0, 300));
    }

    const topics: TopicFromLLM[] = parsed.topics;
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error("LLM returned no topics. Check the prompt or model.");
    }

    // ---------------------------------------------------------------------------
    // Save to Supabase using service role (bypasses RLS)
    // ---------------------------------------------------------------------------
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Clear any previously generated topics for this user
    const { error: deleteError } = await supabaseAdmin
      .from("topics")
      .delete()
      .eq("user_id", user_id);

    if (deleteError) {
      console.error("Warning: could not delete old topics:", deleteError.message);
    }

    // Insert the AI-generated topics
    const topicRows = topics.map((t: TopicFromLLM) => ({
      user_id,
      name: t.name,
      subject: t.subject,
      priority_order: t.priority_order,
      marks_impact: t.marks_impact,
      importance: Math.min(10, Math.max(1, t.importance ?? 5)),
      effort: ["low", "medium", "high"].includes(t.effort) ? t.effort : "medium",
      pyq_frequency: Math.min(10, Math.max(1, t.pyq_frequency ?? 5)),
      proficiency: 30,
      explanation: t.explanation ?? "",
      rank: t.priority_order,
      study_content: t.study_content ?? "",
      quiz_data: Array.isArray(t.quiz_data) ? t.quiz_data : [],
    }));

    const { error: insertError } = await supabaseAdmin.from("topics").insert(topicRows);

    if (insertError) {
      throw new Error(`Failed to save topics to database: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        topicCount: topicRows.length,
        subjects: [...new Set(topicRows.map((t) => t.subject))],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("[optimize-study-plan] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
