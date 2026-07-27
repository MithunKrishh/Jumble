// Supabase Edge Function: optimize-study-plan
// Calls OpenRouter to generate a high-yield study plan,
// then saves all topics (with Mastery Guides + MCQ quizzes) to the topics table.

// NOTE: "Deno" shows red underline in VS Code but works fine at runtime.
// This file runs on Supabase Edge Functions (Deno runtime), not Node.js.
// VS Code checks TypeScript against tsconfig.json which is for the React app (Node/browser).
// All Deno APIs (Deno.env.get, etc.) work correctly when deployed to Supabase.

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

Generate exactly 2 topics per subject, prioritized by marks impact (priority_order 1 = most impactful overall).

For each topic you MUST provide:
- study_content: ~50 words, key formulas/concepts only.
- exactly 2 Multiple Choice Questions (quiz_data).

Respond ONLY with valid JSON. No markdown fences. No extra text.

{"topics":[{"name":"string","subject":"string","priority_order":1,"marks_impact":9,"importance":9,"effort":"low|medium|high","pyq_frequency":8,"proficiency":30,"explanation":"one sentence","study_content":"~50 words","quiz_data":[{"question":"string","options":["a","b","c","d"],"correct_index":0,"explanation":"short"}]}]}`;
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
    // Call OpenRouter (try up to 3 models as fallback)
    // ---------------------------------------------------------------------------
    const prompt = buildPrompt(
      exam_name,
      exam_date,
      subjects,
      study_materials_description ?? "",
      daily_study_hours ?? 4
    );

    const MODELS_TO_TRY = [
      "inclusionai/ling-3.0-flash:free",
      "cognitivecomputations/dolphin3.0-mistral-24b:free",
      "microsoft/phi-3-medium-128k-instruct:free",
    ];

    let openrouterData: any = null;
    let lastModelError = "";

    for (const model of MODELS_TO_TRY) {
      const controller = new AbortController();
      const timeoutMs = 60_000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(`[optimize-study-plan] Trying model: ${model}`);

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "",
            "X-Title": "JUMBLE",
          },
          body: JSON.stringify({
            model,
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

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text();
          lastModelError = `OpenRouter API error (${res.status}) for model ${model}: ${errText.slice(0, 300)}`;
          console.warn(`[optimize-study-plan] Model ${model} failed:`, lastModelError);
          continue;
        }

        openrouterData = await res.json();
        console.log(
          `[optimize-study-plan] Model ${model} succeeded. Response:`,
          JSON.stringify({
            choices: openrouterData.choices,
            usage: openrouterData.usage,
            model: openrouterData.model,
          })
        );
        break;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const msg = err instanceof Error ? err.message : "Unknown error";
        lastModelError = `Model ${model} failed or timed out: ${msg}`;
        console.warn(`[optimize-study-plan]`, lastModelError);
        continue;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!openrouterData) {
      throw new Error(`All OpenRouter models failed. Last error: ${lastModelError}`);
    }

    const message = openrouterData.choices?.[0]?.message;
    const rawContent =
      message?.content ??
      message?.reasoning_content ??
      (typeof message?.content === "string" ? message.content : undefined);

    if (!rawContent) {
      const emptyMsg = `OpenRouter returned an empty response. Full response: ${JSON.stringify(openrouterData).slice(
        0,
        800
      )}`;
      console.error("[optimize-study-plan]", emptyMsg);
      throw new Error(emptyMsg);
    }

    // ---------------------------------------------------------------------------
    // Parse and validate LLM output (with truncation recovery)
    // ---------------------------------------------------------------------------
    // ---------------------------------------------------------------------------
    // Generic JSON recovery for truncated LLM output
    // ---------------------------------------------------------------------------
    function recoverJson(text: string): { topics: TopicFromLLM[] } | null {
      // Try to find the outermost opening brace
      const firstBrace = text.indexOf("{");
      if (firstBrace === -1) return null;

      let depth = 0;
      let lastCompleteObjectEnd = -1;
      let lastCompleteObjectStart = firstBrace;

      for (let i = firstBrace; i < text.length; i++) {
        const ch = text[i];
        if (ch === "{") {
          if (depth === 0) lastCompleteObjectStart = i;
          depth++;
        } else if (ch === "}") {
          depth--;
          if (depth === 0) {
            // Found a complete object at the root level
            lastCompleteObjectEnd = i;
          } else if (depth === 1) {
            // Completed a nested object (like a topic)
            // Mark that we completed a sub-object
          }
        }
      }

      // If depth > 0, we are mid-object. Try to salvage complete topics.
      // Strategy: find all completed `}, {` patterns (topics separated by comma)
      if (depth > 0 && lastCompleteObjectEnd > firstBrace) {
        // We have at least one complete closing brace
        const partialJson = text.substring(firstBrace, lastCompleteObjectEnd + 1) + "]}";
        try {
          return JSON.parse(partialJson);
        } catch {
          // fall through
        }
      }

      // Last resort: try to extract anything that looks like a valid topic
      // by finding all "name" keys
      try {
        const nameMatches = [...text.matchAll(/"name"\s*:\s*"([^"]+)"/g)];
        if (nameMatches.length > 0) {
          // Just return whatever we can salvage - even empty topics with just names
          return { topics: nameMatches.map((m, i) => ({
            name: m[1],
            subject: "",
            priority_order: i + 1,
            marks_impact: 5,
            importance: 5,
            effort: "medium" as const,
            pyq_frequency: 5,
            proficiency: 30,
            explanation: "",
            study_content: "",
            quiz_data: [],
          }))};
        }
      } catch {
        return null;
      }

      return null;
    }

    // Attempt 1: direct parse
    let parsed: { topics: TopicFromLLM[] };
    const parseAttempt = rawContent;

    try {
      parsed = JSON.parse(parseAttempt);
    } catch {
      // Attempt 2: try to recover truncated JSON
      console.warn("[optimize-study-plan] Direct JSON parse failed, attempting truncation recovery...");
      const recovered = recoverJson(parseAttempt);
      if (recovered) {
        parsed = recovered;
        console.log("[optimize-study-plan] Recovery succeeded with", parsed.topics?.length, "topics");
      } else {
        throw new Error("LLM response was not valid JSON. Raw: " + rawContent.slice(0, 300));
      }
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