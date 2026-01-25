import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

/* ---------------- ENV ---------------- */

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  // Don't crash at import time (especially on Render). We'll throw inside generateAIScript.
  console.error("❌ GOOGLE_API_KEY is missing in environment variables.");
}

/* ---------------- GEMINI CONFIG ---------------- */

const genAI = new GoogleGenerativeAI(API_KEY || "");

/* ---------------- WORD TARGETS ---------------- */

const MIN_WORDS = {
  "15min": 2250, // 150 words/min * 15 min
  "30min": 4500, // 150 words/min * 30 min
  "1hr": 9000,   // 150 words/min * 60 min
};

/* ---------------- PROMPT BUILDER ---------------- */

const buildPrompt = ({ topic, duration, mode, part, language }) => {
  const minWords = MIN_WORDS[duration] || 1500;

  return `
    You are an expert educational content creator.
    Create a video script for the topic: "${topic}".
    Duration Target: ${duration} - MUST GENERATE AT LEAST ${minWords} WORDS OF NARRATION.
    Mode: ${mode} (${mode === 'FULL' ? 'Part ' + part : 'Crash Course'}).
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
        "narration": "Welcome to our introduction to Python. Python is a high-level programming language, which means it abstracts away complex details, making it easier for developers to focus on solving problems. It's known for being easy to read and write, with syntax that resembles natural English. This makes it perfect for beginners. Python is also incredibly versatile - you can use it for web development, data science, automation, artificial intelligence, and much more. Major companies and organizations rely on Python for their critical systems.",
        "imagePrompt": "A Python logo with code snippets in the background",
        "examples": [
          "Instagram uses Python's Django framework",
          "Netflix uses Python for data analysis",
          "NASA uses Python for scientific computing"
        ]
      }
    ]
    
    IMPORTANT: Notice how the narration explains each bullet point in detail but does NOT read the examples word-for-word. The narration mentions "major companies" but lets viewers read the specific examples on screen. This is MANDATORY.

    Requirements:
    - **CRITICAL SYNCHRONIZATION RULE**: The "narration" MUST explain and elaborate on the "bullets" shown on the slide.
      * Narration is the spoken audio that plays while the slide is visible.
      * Start by introducing the slide topic, then explain each bullet point in detail.
      * The viewer should hear explanations of what they see on screen.
      * Example: If bullet says "Python is easy to learn", narration should explain WHY and HOW it's easy to learn.
    - "bullets" should be SHORT, concise points (5-10 words each) that appear on screen.
    - "narration" should be DETAILED explanations (50-150 words per slide) that elaborate on the bullets.
    - The narration should be engaging, spoken-style, and educational.
    - Break content into logical slides.
    - "imagePrompt" should be in English, describing a visual aid (diagram, photo, or illustration).
    - **EXAMPLES ARE VISUAL-ONLY**: The "examples" field contains text that appears on the slide but should NOT be read word-for-word in the narration.
      * Examples are displayed in a separate box on the slide for viewers to read.
      * In the narration, you can MENTION that there are examples (e.g., "For instance, companies like Instagram and Netflix use Python extensively")
      * But DO NOT read the exact example text verbatim (e.g., DON'T say "Instagram uses Python's Django framework, Netflix uses Python for data analysis")
      * Keep the narration focused on explaining the bullets, and let viewers read the examples themselves.
    - "examples" should contain 1-2 REAL-WORLD, PRACTICAL examples that illustrate the concept.
      * **MAXIMUM 2 examples per slide** to prevent overflow
      * Examples should be CONCISE: ${language === "en"
      ? "under 60 characters each"
      : "under 40 characters each (shorter for non-English to accommodate font scaling)"
    }
      * Examples should be concrete and relatable (e.g., "Netflix uses React for its UI" or "Gmail's inbox is a real-world queue")
      * Make examples diverse and interesting
      * Examples should help learners understand how the concept applies in practice
    - **CRITICAL**: The total word count of "narration" across all slides MUST be AT LEAST ${minWords} WORDS.
      * This is MANDATORY to fill the entire ${duration} duration.
      * Each slide's narration should be detailed and comprehensive, not brief summaries.
      * Add thorough explanations, context, and elaboration to reach the word count target.
    - For "Full Course", cover deep details. For "Crash Course", summarize key concepts.
    - Include examples for at least 70% of slides to make content engaging and practical.
  `;
};

/* ---------------- HELPERS ---------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function logGeminiError(err, ctx = {}) {
  // Print useful info that Render logs will actually show
  console.error("❌ Gemini Error Details:", {
    ...ctx,
    message: err?.message,
    name: err?.name,
    status: err?.status || err?.response?.status,
    code: err?.code,
    stack: err?.stack,
  });

  // Some SDK errors include a response body/text
  try {
    const maybeText = err?.response?.text?.();
    if (maybeText) console.error("❌ Gemini error response text:", maybeText);
  } catch (_) { }
}

async function generateWithModelAndRetry(modelName, prompt, attempts = 3) {
  const currentModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`🤖 Attempting generation with model: ${modelName} (try ${i + 1}/${attempts})`);
      const result = await currentModel.generateContent(prompt);
      return result;
    } catch (e) {
      lastErr = e;
      logGeminiError(e, { modelName, attempt: i + 1 });

      const status = e?.status || e?.response?.status;
      const transient =
        status === 429 || status === 500 || status === 503 || status === 504 || status == null;

      if (!transient || i === attempts - 1) break;

      const backoff = 1000 * Math.pow(2, i); // 1s, 2s, 4s
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

    const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"];
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
    const text = response.text();

    // Parse JSON with robust cleanup
    let scriptData = [];
    try {
      scriptData = JSON.parse(text);
    } catch (parseErr) {
      console.error("JSON Parsing failed, attempting cleanup...");

      let cleanedText = text;

      // 1. Remove markdown code blocks
      cleanedText = cleanedText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      // 2. Remove trailing commas before closing brackets
      cleanedText = cleanedText.replace(/,(\s*[}\]])/g, "$1");

      // 3. Fix common quote issues
      cleanedText = cleanedText.replace(/'/g, '"');

      // 4. Remove any text before first [ and after last ]
      const firstBracket = cleanedText.indexOf("[");
      const lastBracket = cleanedText.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);
      }

      try {
        scriptData = JSON.parse(cleanedText);
      } catch (secondErr) {
        console.error("❌ JSON cleanup failed. Raw response (first 1500 chars):");
        console.error(text.substring(0, 1500) + "...");
        throw new Error(
          "Failed to parse Gemini response as JSON. The AI may have generated invalid JSON format."
        );
      }
    }

    if (!Array.isArray(scriptData)) {
      throw new Error("Gemini response is not an array");
    }

    // Add word counts for timing calculations
    scriptData = scriptData.map((slide) => ({
      ...slide,
      wordCount: String(slide?.narration || "").split(/\s+/).filter(Boolean).length,
    }));

    // Validate total word count
    const totalWords = scriptData.reduce((sum, slide) => sum + (slide.wordCount || 0), 0);
    const minWords = MIN_WORDS[duration] || 1500;

    console.log(`✅ Script generated using model: ${usedModel}`);
    console.log(`📊 Generated ${totalWords} words (target: ${minWords} words)`);

    if (totalWords < minWords * 0.7) {
      console.warn(
        `⚠️ WARNING: Generated content (${totalWords} words) is significantly less than target (${minWords} words)`
      );
      console.warn(`⚠️ This may result in shorter video duration than requested.`);
    }

    return scriptData;
  } catch (err) {
    // This is the key: print useful details to Render logs.
    logGeminiError(err, { where: "generateAIScript-final" });
    throw new Error("Failed to generate script: " + (err?.message || "unknown error"));
  }
};
