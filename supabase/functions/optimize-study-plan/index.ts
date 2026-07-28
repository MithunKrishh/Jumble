// Supabase Edge Function: optimize-study-plan
// Calls OpenRouter to generate high-yield study plan,
// then saves all topics (with Mastery Guides + MCQ quizzes) to the topics table.
// Uses openrouter/auto for automatic model routing, with stable fallbacks.

// NOTE: "Deno" shows red underline in VS Code but works fine at runtime.
// This file runs on Supabase Edge Functions (Deno runtime), not Node.js.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Build the Academic Strategist prompt enriched with study_materials_description
// ---------------------------------------------------------------------------
function buildPrompt(
  examName: string,
  examDate: string,
  subjects: string[],
  studyMaterials: string,
  dailyHours: number
): string {
  return `You are an elite exam preparation strategist specializing in HIGH YIELD study plans.

MISSION: Generate a prioritized syllabus for "${examName}" (exam date: ${examDate}).
Subjects to cover: ${subjects.join(", ")}.
Daily study availability: ${dailyHours} hours/day.
Student's enrolled resources / study materials: ${studyMaterials || "Not specified — use standard syllabus weightage."}

HIGH YIELD PRINCIPLE — Strictly enforce this:
Rank every topic by "Maximum Marks Impact". Prioritize topics that:
1. Appear most frequently in past exams (highest PYQ frequency)
2. Carry the highest marks weight in the exam
3. Can be mastered in the least time for maximum score gain

Generate exactly the top 5 highest-yield topics across ALL subjects (combined), ranked by marks impact (priority_order 1 = most impactful overall). Do NOT generate more than 5 topics total.

For each topic you MUST return:
- marks_impact: A concise string describing exactly how many marks this topic can contribute and why (e.g. "15-20 marks: 3-4 direct PYQ questions every year")
- study_content: A detailed Markdown-formatted mastery guide covering key formulas, concepts, mnemonics, and high-yield points (300-500 words)
- quiz_data: Exactly 5 multiple-choice questions testing the most critical concepts. Each question must have 4 options and the correct_answer must match one of the options exactly (same casing/spelling).

IMPORTANT: The correct_answer field must be the exact text of one of the options. Do NOT use indices.
IMPORTANT: If you include math formulas, use plain text notation (e.g. "E = k*q/r^2", "F = ma", "x = (-b +/- sqrt(b^2 - 4ac)) / (2a)"). Do NOT use LaTeX and do NOT use any backslashes in your response.

Respond ONLY with valid JSON matching this exact schema:
{
  "topics": [
    {
      "name": "string",
      "subject": "string",
      "priority_order": number,
      "marks_impact": "string",
      "study_content": "string (Markdown)",
      "quiz_data": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correct_answer": "string"
        }
      ]
    }
  ]
}

No markdown fences, no extra text. Pure JSON only. No backslashes.`;
}

// ---------------------------------------------------------------------------
// Robust JSON extractor: finds the first "{" and last "}" to handle
// free models that prepend/append prose before/after the JSON payload.
// ---------------------------------------------------------------------------
function extractJsonObject(raw: string): string | null {
  const firstOpen = raw.indexOf("{");
  const lastClose = raw.lastIndexOf("}");
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    return raw.slice(firstOpen, lastClose + 1);
  }
  return null;
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

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey) {
      console.error("[optimize-study-plan] OPENROUTER_API_KEY secret is not configured.");
      return new Response(
        JSON.stringify({ error: "AI provider API key is not configured on this Supabase project." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------------------------------------------
    // Fetch study_materials_description from exam_contexts for enrichment
    // ---------------------------------------------------------------------------
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let enrichedStudyMaterials = study_materials_description ?? "";
    if (!enrichedStudyMaterials) {
      try {
        const { data: examCtx } = await supabaseAdmin
          .from("exam_contexts")
          .select("study_materials_description")
          .eq("user_id", user_id)
          .single();

        if (examCtx?.study_materials_description) {
          enrichedStudyMaterials = examCtx.study_materials_description;
          console.log("[optimize-study-plan] Injected study_materials_description from exam_contexts table.");
        }
      } catch (fetchErr) {
        console.warn("[optimize-study-plan] Could not fetch exam_contexts, using provided value:", fetchErr);
      }
    }

    // ---------------------------------------------------------------------------
    // Build prompt
    // ---------------------------------------------------------------------------
    const userPrompt = buildPrompt(
      exam_name,
      exam_date,
      subjects,
      enrichedStudyMaterials,
      daily_study_hours ?? 4
    );

    // ---------------------------------------------------------------------------
    // Call OpenRouter API with Academic Strategist system prompt
    // ---------------------------------------------------------------------------
    const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";

    // Define model fallback chain
    // openrouter/auto lets OpenRouter pick the best available model automatically.
    // Fallbacks are stable, widely-available models.
    const modelChain = [
      "openrouter/auto",
      "deepseek/deepseek-chat",
      "google/gemini-flash-1.5",
    ];

    let rawText: string | null = null;
    let lastModelError: string | null = null;

    for (const model of modelChain) {
      console.log(`[optimize-study-plan] Attempting OpenRouter model: ${model}`);

      const controller = new AbortController();
      const timeoutMs = 30_000; // 30 seconds per model
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let res: Response;
      try {
        res = await fetch(openRouterUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openRouterKey}`,
            "HTTP-Referer": "https://jumble.study",
            "X-Title": "Jumble Study Planner",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: "You are an Academic Strategist. Respond only with valid JSON matching the provided schema. No markdown fences, no explanation outside the JSON object.",
              },
              {
                role: "user",
                content: userPrompt,
              },
            ],
            temperature: 0.4,
            max_tokens: 16384,
          }),
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        const msg = fetchErr instanceof Error ? fetchErr.message : "Network error";
        lastModelError = `Model ${model} failed (network): ${msg}`;
        console.error(`[optimize-study-plan] ${lastModelError}`);
        continue;
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        const apiResponseText = await res.text();
        lastModelError = `Model ${model} returned status ${res.status}: ${apiResponseText}`;
        console.error(`[optimize-study-plan] ${lastModelError}`);
        continue;
      }

      const data = await res.json();
      console.log(
        `[optimize-study-plan] Response from ${model}:`,
        JSON.stringify({
          choices: data.choices?.length,
          usage: data.usage,
        })
      );

      const content = data.choices?.[0]?.message?.content;
      if (content && typeof content === "string") {
        rawText = content;
        console.log(`[optimize-study-plan] Using model ${model} (success). Raw length: ${rawText.length}`);
        break; // Success — exit the fallback loop
      } else {
        lastModelError = `Model ${model} returned an empty or invalid response body.`;
        console.error(`[optimize-study-plan] ${lastModelError}`);
      }
    }

    // If all models in the chain failed, return the last error
    if (rawText === null) {
      return new Response(
        JSON.stringify({
          error: `All OpenRouter models failed. Last error: ${lastModelError}`,
          detail: lastModelError,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Robust JSON extraction — locate the first "{" and last "}"
    const extractedJson = extractJsonObject(rawText);
    if (!extractedJson) {
      const err = new Error("Could not locate a JSON object in the AI response.");
      return new Response(
        JSON.stringify({ error: err.message, detail: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Sanitize backslashes (unescaped LaTeX like \frac breaks JSON.parse)
    // Replace single backslashes not followed by a JSON-valid escape char with double backslashes
    const sanitizedJson = extractedJson.replace(/\\(?!["\\\/bfnrtu])/g, "\\\\");

    // Step 3: Parse the JSON response
    let parsedTopics: Array<{
      name: string;
      subject: string;
      priority_order: number;
      marks_impact: string;
      study_content: string;
      quiz_data: Array<{
        question: string;
        options: string[];
        correct_answer: string;
      }>;
    }> = [];

    try {
      const parsed = JSON.parse(sanitizedJson);
      if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
        const err = new Error("AI response did not contain any topics.");
        return new Response(
          JSON.stringify({ error: err.message, detail: JSON.stringify(parsed) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      parsedTopics = parsed.topics;
      console.log("[optimize-study-plan] Successfully parsed", parsedTopics.length, "topics from OpenRouter");
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "Unknown parse error";
      console.error("[optimize-study-plan] JSON parse failed:", msg);
      return new Response(
        JSON.stringify({ error: `Failed to parse JSON: ${msg}`, detail: extractedJson }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------------------------------------------
    // Save to Supabase using service role (bypasses RLS)
    // ---------------------------------------------------------------------------

    // Clear any previously generated topics for this user
    const { error: deleteError } = await supabaseAdmin
      .from("topics")
      .delete()
      .eq("user_id", user_id);

    if (deleteError) {
      console.error("Warning: could not delete old topics:", deleteError.message);
    }

    // Transform marks_impact string to a numeric score for DB
    const extractMarksNumber = (marksStr: string): number => {
      const match = marksStr.match(/(\d+)/);
      return match ? Math.min(10, Math.max(1, parseInt(match[1], 10) || 5)) : 5;
    };

    // Transform quiz_data: convert correct_answer to correct_index for backwards compatibility
    const transformQuizData = (
      quizData: Array<{ question: string; options: string[]; correct_answer: string }>
    ): Array<{ question: string; options: string[]; correct_index: number; explanation: string }> => {
      return quizData.map((q) => {
        const correctIndex = q.options.findIndex(
          (opt) => opt.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()
        );
        return {
          question: q.question,
          options: q.options,
          correct_index: correctIndex >= 0 ? correctIndex : 0,
          explanation: `Correct answer: ${q.correct_answer}`,
        };
      });
    };

    // Enforce max 5 topics to keep response size manageable
    if (parsedTopics.length > 5) {
      parsedTopics = parsedTopics.slice(0, 5);
    }

    // Insert the AI-generated topics
    const topicRows = parsedTopics.map((t, idx) => {
      const marksNum = extractMarksNumber(t.marks_impact || "");
      return {
        user_id,
        name: t.name,
        subject: t.subject,
        priority_order: t.priority_order ?? idx + 1,
        marks_impact: marksNum,
        importance: marksNum,
        effort: "medium" as const,
        pyq_frequency: marksNum,
        proficiency: 30,
        explanation: t.marks_impact || "",
        rank: t.priority_order ?? idx + 1,
        study_content: t.study_content ?? "",
        quiz_data: transformQuizData(t.quiz_data || []),
      };
    });

    const { error: insertError } = await supabaseAdmin.from("topics").insert(topicRows);

    if (insertError) {
      return new Response(
        JSON.stringify({ error: `Failed to save topics to database: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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