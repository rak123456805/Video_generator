import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

/* ---------------- ENV ---------------- */

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("❌ GOOGLE_API_KEY is missing in environment variables.");
}

/* ---------------- GEMINI CONFIG ---------------- */

const genAI = new GoogleGenerativeAI(API_KEY || "");

/* ---------------- WORD TARGETS ---------------- */

const MIN_WORDS = {
  "15min": 2250,
  "30min": 4500,
  "1hr": 9000,
};

/* ---------------- PROMPT BUILDER ---------------- */

const buildPrompt = ({ topic, duration, mode, part, language }) => {
  const minWords = MIN_WORDS[duration] || 1500;

  return `
You are an expert educational content creator.
Create a video script for the topic: "${topic}".
Duration Target: ${duration} - MUST GENERATE AT LEAST ${minWords} WORDS OF NARRATION.
Mode: ${mode} (${mode === "FULL" ? "Part " + part : "Crash Course"}).
Language: ${language} (Ensure script is in this language).

Return ONLY a JSON array where each object represents a slide/scene:
[
  {
    "title": "Introduction to Python",
    "bullets": [
      "High-level programming language",
      "Easy to read and write",
      "Versatile for many applications"
    ],
    "narration": "Welcome to our introduction to Python...",
    "imagePrompt": "A Python logo with code snippets in the background",
    "examples": [
      "Instagram uses Python's Django framework",
      "Netflix uses Python for data analysis"
    ]
  }
]

IMPORTANT: Narration explains bullets in detail but does NOT read the examples word-for-word.

Requirements:
- CRITICAL SYNCHRONIZATION RULE: narration MUST elaborate on bullets.
- bullets short (5-10 words each)
- narration detailed (50-150 words per slide)
- imagePrompt in English
- examples: VISUAL-ONLY, DO NOT read word-for-word
- examples max 2 per slide
- Total narration words MUST be AT LEAST ${minWords}.
`.trim();
};

/* ---------------- HELPERS ---------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function logGeminiError(err, ctx = {}) {
  console.error("❌ Gemini Error Details:", {
    ...ctx,
    message: err?.message,
    name: err?.name,
    status: err?.status || err?.response?.status,
    code: err?.code,
    stack: err?.stack,
  });
}

/**
 * Extract the JSON array safely from a model response.
 * Handles:
 * - extra text before/after
 * - markdown fences
 * - truncated output (missing closing ]): repairs by trimming to last complete object and closing ]
 */
function extractAndRepairJSONArray(raw) {
  if (!raw || !raw.trim()) throw new Error("Empty AI response");

  let text = raw.trim();

  // Remove markdown code fences if any
  text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Find first '['
  const firstBracket = text.indexOf("[");
  if (firstBracket === -1) {
    throw new Error("No JSON array start '[' found in AI response");
  }

  // Prefer last ']'
  let lastBracket = text.lastIndexOf("]");
  if (lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = text.substring(firstBracket, lastBracket + 1);
    return candidate;
  }

  // If no closing bracket, likely truncated.
  // Strategy: take from first '[' up to last complete '}' and close array.
  const fromArrayStart = text.substring(firstBracket);

  const lastObjEnd = fromArrayStart.lastIndexOf("}");
  if (lastObjEnd === -1) {
    throw new Error("Truncated response: no complete object '}' found");
  }

  let repaired = fromArrayStart.substring(0, lastObjEnd + 1).trim();

  // Remove trailing commas after last object (if any)
  repaired = repaired.replace(/,\s*$/g, "");

  // Close the array
  repaired = repaired + "\n]";

  return repaired;
}

async function generateWithModelAndRetry(modelName, prompt, attempts = 3) {
  // Only use JSON mode for models that officially support it in this SDK version
  const supportsJson = modelName.includes("1.5") || modelName.includes("2.0") || modelName.includes("2.5") || modelName.includes("exp");

  const currentModel = genAI.getGenerativeModel({
    model: modelName,
    ...(supportsJson ? { generationConfig: { responseMimeType: "application/json" } } : {}),
  });

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`🤖 Attempting generation with model: ${modelName} (supportsJson: ${supportsJson}) (try ${i + 1}/${attempts})`);
      const result = await currentModel.generateContent(prompt);
      return result;
    } catch (e) {
      lastErr = e;
      logGeminiError(e, { modelName, attempt: i + 1 });

      const status = e?.status || e?.response?.status;
      const isQuotaError = status === 429;
      const transient = isQuotaError || status === 500 || status === 503 || status === 504 || status == null;

      if (isQuotaError) {
        console.error(`🛑 QUOTA EXCEEDED for model ${modelName}.`);
        if (i < attempts - 1) {
          const backoff = 3000 * Math.pow(2, i);
          console.warn(`⏳ Retrying ${modelName} in ${backoff}ms after quota hit...`);
          await sleep(backoff);
          continue;
        }
      }

      if (!transient || i === attempts - 1) break;

      const backoff = 2000 * Math.pow(2, i);
      console.warn(`⏳ Retrying ${modelName} in ${backoff}ms due to status ${status ?? "unknown"}...`);
      await sleep(backoff);
    }
  }

  throw lastErr;
}

/* ---------------- GEMINI CALL ---------------- */

export const generateAIScript = async ({
  topic,
  duration,
  mode,
  part = 1,
  language = "en",
}) => {
  if (!API_KEY) {
    throw new Error("GOOGLE_API_KEY not set in environment variables (Render Environment).");
  }

  const prompt = buildPrompt({ topic, duration, mode, part, language });

  try {
    console.log(`🧠 Requesting structured script from Gemini for "${topic}"...`);

    const models = [
      "gemini-1.5-flash",
      "gemini-2.0-flash-exp",
      "gemini-2.5-flash", // User's custom/working name
      "gemini-1.5-pro",
      "gemini-pro" // Alias for 1.0 which is more stable than specific versions
    ];
    let result;
    let lastError;
    let usedModel = null;

    for (const modelName of models) {
      try {
        result = await generateWithModelAndRetry(modelName, prompt, 3);
        usedModel = modelName;
        break;
      } catch (e) {
        console.warn(`⚠️ Model ${modelName} failed: ${e?.message || e}`);
        lastError = e;
      }
    }

    if (!result) throw lastError || new Error("All Gemini model attempts failed.");

    const response = await result.response;
    const rawText = response.text();

    let scriptData = [];

    try {
      // Try direct parse first
      scriptData = JSON.parse(rawText);
    } catch (_) {
      console.warn("JSON Parsing failed, extracting/repairing JSON array...");

      // Extract + repair
      const repairedJson = extractAndRepairJSONArray(rawText);

      try {
        scriptData = JSON.parse(repairedJson);
      } catch (e2) {
        console.error("❌ JSON repair parse failed. Raw response (first 2000 chars):");
        console.error(rawText.substring(0, 2000) + "...");
        console.error("❌ Repaired JSON (first 2000 chars):");
        console.error(repairedJson.substring(0, 2000) + "...");
        throw new Error("Failed to parse Gemini response as JSON even after repair.");
      }
    }

    if (!Array.isArray(scriptData)) {
      throw new Error("Gemini response is not a JSON array.");
    }

    // Add word counts
    scriptData = scriptData.map((slide) => ({
      ...slide,
      wordCount: String(slide?.narration || "").split(/\s+/).filter(Boolean).length,
    }));

    const totalWords = scriptData.reduce((sum, slide) => sum + (slide.wordCount || 0), 0);
    const minWords = MIN_WORDS[duration] || 1500;

    console.log(`✅ Script generated using model: ${usedModel}`);
    console.log(`📊 Generated ${totalWords} words (target: ${minWords} words)`);

    if (totalWords < minWords * 0.7) {
      console.warn(
        `⚠️ WARNING: Generated content (${totalWords} words) is significantly less than target (${minWords} words)`
      );
    }

    return scriptData;
  } catch (err) {
    logGeminiError(err, { where: "generateAIScript-final" });
    const isQuota = err?.status === 429 || err?.message?.includes("429");
    const msg = isQuota
      ? "Gemini API Quota Exceeded. Please wait a few minutes or upgrade your plan."
      : (err?.message || "unknown error");
    throw new Error("Failed to generate script: " + msg);
  }
};
