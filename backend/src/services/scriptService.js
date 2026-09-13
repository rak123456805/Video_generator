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

/**
 * Word-count targets keyed by the exact duration string the frontend sends.
 * The frontend builds: `${duration}min` where duration ∈ ["5","10","15"].
 *
 * Spoken-word rate used: ~140 words/minute (comfortable instructional pace).
 * The max is capped slightly below the full minute count so the final video
 * never significantly overshoots the user-selected duration.
 *
 *   5 min  → 140×5 = 700 words target; cap at 750 to give a small buffer
 *   10 min → 140×10 = 1400; cap at 1500
 *   15 min → 140×15 = 2100; cap at 2250
 */
const WORD_TARGETS = {
  "5min":  { min: 600,  max: 750  },
  "10min": { min: 1200, max: 1500 },
  "15min": { min: 1800, max: 2250 },
};

/** Fallback when an unrecognised duration string is received. */
const DEFAULT_TARGET = { min: 1200, max: 1500 };

/* ---------------- PROMPT BUILDER ---------------- */

const buildPrompt = ({ topic, duration, mode, part, language }) => {
  const { min, max } = WORD_TARGETS[duration] || DEFAULT_TARGET;

  return `
You are an expert educational content creator.
Create a video script for the topic: "${topic}".
Duration Target: ${duration} - Generate between ${min} and ${max} words of narration total. Do not exceed ${max} words.
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
- Total narration words MUST be between ${min} and ${max}. Do NOT exceed ${max} words.
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
 * Try to read RetryInfo retryDelay from the error message.
 * Your logs show: retryDelay":"27s" or "Please retry in 27.8s"
 */
function getRetryDelayMs(err) {
  const msg = String(err?.message || "");
  // retryDelay":"27s"
  const m1 = msg.match(/retryDelay":"(\d+)s"/i);
  if (m1?.[1]) return Number(m1[1]) * 1000;

  // Please retry in 27.807283311s
  const m2 = msg.match(/Please retry in ([0-9.]+)s/i);
  if (m2?.[1]) return Math.ceil(Number(m2[1]) * 1000);

  return null;
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
    return text.substring(firstBracket, lastBracket + 1);
  }

  // If no closing bracket, likely truncated.
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

async function generateWithGemini25Flash(prompt, attempts = 3) {
  const modelName = "gemini-2.5-flash";

  // In your SDK/version, JSON response config works for 2.5 flash (based on your successful logs)
  const currentModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`🤖 Attempting generation with model: ${modelName} (try ${i + 1}/${attempts})`);
      const result = await currentModel.generateContent(prompt);
      return { result, usedModel: modelName };
    } catch (e) {
      lastErr = e;
      logGeminiError(e, { modelName, attempt: i + 1 });

      const status = e?.status || e?.response?.status;

      // Respect RetryInfo if quota hit
      if (status === 429 && i < attempts - 1) {
        const retryDelayMs = getRetryDelayMs(e);
        const waitMs = retryDelayMs ?? 30000; // default 30s if not provided
        console.warn(`🛑 QUOTA EXCEEDED. Waiting ${waitMs}ms then retrying...`);
        await sleep(waitMs);
        continue;
      }

      // transient server errors
      const transient = status === 500 || status === 503 || status === 504 || status == null;
      if (transient && i < attempts - 1) {
        const backoff = 5000 * Math.pow(2, i); // 5s, 10s
        console.warn(`⏳ Retrying in ${backoff}ms due to status ${status ?? "unknown"}...`);
        await sleep(backoff);
        continue;
      }

      break;
    }
  }

  throw lastErr;
}

/* ---------------- NARRATION TRIM HELPER ---------------- */

/**
 * Trim narration across slides until the total word count falls at or below
 * `targetMax`. Works by removing complete trailing slides first, then
 * truncating the last slide's narration sentence-by-sentence.
 *
 * This is a last-resort guard — ideally the model respects the prompt cap.
 */
function trimToMaxWords(slides, targetMax) {
  // Count helpers
  const countWords = (s) => String(s || "").split(/\s+/).filter(Boolean).length;

  // Work on a shallow-copy so we don't mutate the original
  let result = slides.map((s) => ({ ...s }));

  // First pass: drop trailing slides until we're under the cap
  while (result.length > 1) {
    const total = result.reduce((sum, s) => sum + countWords(s.narration), 0);
    if (total <= targetMax) break;
    const dropped = result.pop();
    console.warn(
      `✂️  Dropped slide "${dropped.title}" to meet word cap (was ${total} words, cap ${targetMax})`
    );
  }

  // Second pass: truncate last slide's narration sentence-by-sentence
  let total = result.reduce((sum, s) => sum + countWords(s.narration), 0);
  if (total > targetMax && result.length > 0) {
    const last = result[result.length - 1];
    const sentences = last.narration.split(/(?<=[.!?।])\s+/);
    while (sentences.length > 1 && total > targetMax) {
      const removed = sentences.pop();
      total -= countWords(removed);
    }
    last.narration = sentences.join(" ").trim();
    console.warn(`✂️  Truncated last slide narration to meet word cap — new total: ${total} words`);
  }

  // Re-calculate word counts on the trimmed slides
  return result.map((s) => ({
    ...s,
    wordCount: countWords(s.narration),
  }));
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

  const { min, max } = WORD_TARGETS[duration] || DEFAULT_TARGET;
  const prompt = buildPrompt({ topic, duration, mode, part, language });

  try {
    console.log(`🧠 Requesting structured script from Gemini 2.5 Flash for "${topic}"...`);
    console.log(`📏 Word target: ${min}–${max} words (duration: ${duration})`);

    const { result, usedModel } = await generateWithGemini25Flash(prompt, 3);

    const response = await result.response;
    const rawText = response.text();

    let scriptData = [];

    try {
      scriptData = JSON.parse(rawText);
    } catch (_) {
      console.warn("JSON Parsing failed, extracting/repairing JSON array...");
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

    // Add word counts to every slide
    scriptData = scriptData.map((slide) => ({
      ...slide,
      wordCount: String(slide?.narration || "")
        .split(/\s+/)
        .filter(Boolean).length,
    }));

    const totalWords = scriptData.reduce((sum, slide) => sum + (slide.wordCount || 0), 0);

    console.log(`✅ Script generated using model: ${usedModel}`);
    console.log(`📊 Generated ${totalWords} words (target: ${min}–${max} words)`);

    /* ---- Guard: trim if model exceeded the cap by more than 10% ---- */
    if (totalWords > max * 1.1) {
      console.warn(
        `⚠️  WARNING: Script too long (${totalWords} words > cap ${max} words). Trimming...`
      );
      scriptData = trimToMaxWords(scriptData, max);
      const trimmedTotal = scriptData.reduce((sum, s) => sum + (s.wordCount || 0), 0);
      console.log(`✂️  Trimmed to ${trimmedTotal} words`);
    }

    /* ---- Guard: warn if model produced far too little content ---- */
    if (totalWords < min * 0.7) {
      console.warn(
        `⚠️  WARNING: Generated content (${totalWords} words) is significantly less than target (${min} words)`
      );
    }

    return scriptData;
  } catch (err) {
    logGeminiError(err, { where: "generateAIScript-final" });

    const status = err?.status || err?.response?.status;
    const isQuota = status === 429 || String(err?.message || "").includes("429");

    const msg = isQuota
      ? "Gemini API Quota Exceeded. Please wait and retry, or upgrade your plan."
      : (err?.message || "unknown error");

    throw new Error("Failed to generate script: " + msg);
  }
};
