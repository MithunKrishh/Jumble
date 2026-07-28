// Supabase Edge Function: optimize-study-plan
// Calls Google Gemini (REST API) to generate high-yield study plan,
// then saves all topics (with Mastery Guides + MCQ quizzes) to the topics table.

// NOTE: "Deno" shows red underline in VS Code but works fine at runtime.
// This file runs on Supabase Edge Functions (Deno runtime), not Node.js.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Build the Gemini prompt enriched with study_materials_description
// ---------------------------------------------------------------------------
function buildPrompt(
  examName: string,
  examDate: string,
  subjects: string[],
  studyMaterials: string,
  dailyHours: number
): string {
  return `You are an elite exam preparation strategist specializing in HIGH YIELD study plans.

MISSION: Generate a complete, prioritized syllabus for "${examName}" (exam date: ${examDate}).
Subjects to cover: ${subjects.join(", ")}.
Daily study availability: ${dailyHours} hours/day.
Student's enrolled resources / study materials: ${studyMaterials || "Not specified — use standard syllabus weightage."}

HIGH YIELD PRINCIPLE — Strictly enforce this:
Rank every topic by "Maximum Marks Impact". Prioritize topics that:
1. Appear most frequently in past exams (highest PYQ frequency)
2. Carry the highest marks weight in the exam
3. Can be mastered in the least time for maximum score gain

Generate exactly 2 topics per subject, prioritized by marks impact (priority_order 1 = most impactful overall).

For each topic you MUST return:
- marks_impact: A concise string describing exactly how many marks this topic can contribute and why (e.g. "15-20 marks: 3-4 direct PYQ questions every year")
- study_content: A detailed Markdown-formatted mastery guide covering key formulas, concepts, mnemonics, and high-yield points (300-500 words)
- quiz_data: Exactly 5 multiple-choice questions testing the most critical concepts. Each question must have 4 options and the correct_answer must match one of the options exactly (same casing/spelling).

IMPORTANT: The correct_answer field must be the exact text of one of the options. Do NOT use indices.

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

No markdown fences, no extra text. Pure JSON only.`;
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

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      console.error("[optimize-study-plan] GEMINI_API_KEY secret is not configured.");
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY secret is not configured on this Supabase project." }),
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
    // Call Gemini API via REST (gemini-1.5-flash) with structured output
    // ---------------------------------------------------------------------------
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
    }> | null = null;

    // Try models in order: gemini-2.0-flash (supports responseSchema) -> gemini-1.5-flash (responseMimeType only)
    const MODELS_TO_TRY = [
      { model: "gemini-2.0-flash", useSchema: true },
      { model: "gemini-1.5-flash", useSchema: false },
    ];

    let lastModelError = "";

    for (const { model, useSchema } of MODELS_TO_TRY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

      console.log(`[optimize-study-plan] Trying model: ${model} (useSchema: ${useSchema})`);

      const controller = new AbortController();
      const timeoutMs = 90_000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const responseSchema = {
        type: "object",
        properties: {
          topics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                subject: { type: "string" },
                priority_order: { type: "number" },
                marks_impact: { type: "string" },
                study_content: { type: "string" },
                quiz_data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 4,
                        maxItems: 4,
                      },
                      correct_answer: { type: "string" },
                    },
                    required: ["question", "options", "correct_answer"],
                  },
                  minItems: 5,
                  maxItems: 5,
                },
              },
              required: ["name", "subject", "priority_order", "marks_impact", "study_content", "quiz_data"],
            },
          },
        },
        required: ["topics"],
      };

      const generationConfig: Record<string, unknown> = {
        temperature: 0.4,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      };

      // Only include responseSchema for models that support it (gemini-2.0-flash+)
      if (useSchema) {
        generationConfig.responseSchema = responseSchema;
      }

      try {
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: "You are an expert exam preparation strategist. Respond only with valid JSON matching the provided schema. No markdown fences, no explanation outside the JSON object." }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig,
          }),
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text();
          lastModelError = `Gemini API error (${res.status}) for model ${model}: ${errText.slice(0, 500)}`;
          console.warn(`[optimize-study-plan] Model ${model} failed:`, lastModelError);
          continue;
        }

        const geminiData = await res.json();
        console.log(
          `[optimize-study-plan] Model ${model} response:`,
          JSON.stringify({
            candidates: geminiData.candidates?.length,
            usage: geminiData.usageMetadata,
          })
        );

        // Extract text from Gemini response
        const candidate = geminiData.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text;

        if (!rawText) {
          lastModelError = `Gemini model ${model} returned empty response.`;
          console.warn("[optimize-study-plan]", lastModelError);
          continue;
        }

        console.log("[optimize-study-plan] Raw Gemini response length:", rawText.length);

        // Parse the structured JSON response
        const parsed = JSON.parse(rawText);
        if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
          lastModelError = `Gemini model ${model} returned no topics.`;
          console.warn("[optimize-study-plan]", lastModelError);
          continue;
        }

        parsedTopics = parsed.topics;
        console.log("[optimize-study-plan] Successfully parsed", parsedTopics.length, "topics from Gemini using", model);
        break;
      } catch (modelErr) {
        clearTimeout(timeoutId);
        const msg = modelErr instanceof Error ? modelErr.message : "Unknown error";
        lastModelError = `Model ${model} failed: ${msg}`;
        console.warn(`[optimize-study-plan]`, lastModelError);
        continue;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!parsedTopics || parsedTopics.length === 0) {
      console.error("[optimize-study-plan] All models failed. Last error:", lastModelError);
      return new Response(
        JSON.stringify({ error: "Gemini API failed to process study plan" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Insert the AI-generated topics (parsedTopics is guaranteed non-null here due to the check above)
    const topicRows = parsedTopics!.map((t, idx) => {
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
      JSON.stringify({ error: "Gemini API failed to process study plan" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});