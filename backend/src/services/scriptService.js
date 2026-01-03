/* src/services/scriptService.js */

import dotenv from "dotenv";
dotenv.config();

/* ---------------- CONFIG ---------------- */

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  throw new Error("GOOGLE_API_KEY not found in .env");
}

// ✅ Model supported by your API key
const GEMINI_MODEL = "models/gemini-2.5-flash";

// Gemini REST endpoint
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

// Minimum word targets by duration
const MIN_WORDS = {
  "15min": 2500,
  "30min": 5000,
  "1hr": 10000,
};

/* ---------------- LANGUAGE CONFIG ---------------- */

const LANGUAGE_CONFIG = {
  en: {
    label: "English",
    script: "Latin",
  },
  hi: {
    label: "Hindi",
    script: "Devanagari",
    font: "NotoSansDevanagari-Bold.ttf",
  },
  mr: {
    label: "Marathi",
    script: "Devanagari",
    font: "NotoSansDevanagari-Bold.ttf",
  },
  bn: {
    label: "Bengali",
    script: "Bengali",
    font: "NotoSansBengali-Bold.ttf",
  },
  kn: {
    label: "Kannada",
    script: "Kannada",
    font: "NotoSansKannada-Bold.ttf",
  },
  ta: {
    label: "Tamil",
    script: "Tamil",
    font: "NotoSansTamil-Bold.ttf",
  },
  te: {
    label: "Telugu",
    script: "Telugu",
    font: "NotoSansTelugu-Bold.ttf",
  },
  ml: {
    label: "Malayalam",
    script: "Malayalam",
    font: "NotoSansMalayalam-Bold.ttf",
  },
};

/* ---------------- PROMPT BUILDER ---------------- */

const buildPrompt = ({ topic, duration, mode, part, language }) => {
  const minWords = MIN_WORDS[duration] || 2500;
  const lang =
    LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;

  const LANGUAGE_RULES = `
STRICT LANGUAGE REQUIREMENTS (MANDATORY):
- Write the ENTIRE output ONLY in ${lang.label}.
- Use ONLY ${lang.script} Unicode characters.
- DO NOT mix English alphabets with ${lang.label}.
- No Hinglish / Tanglish / Kanglish.
- Technical terms (HTML, CSS, Box Model, etc.) may remain in English,
  but ALL explanations MUST be in ${lang.label}.
- Output must be UTF-8 compatible and suitable for ${lang.script} fonts.
`;

  if (mode === "CRASH") {
    return `
${LANGUAGE_RULES}

Create a CRASH COURSE script.

Topic: ${topic}
Target Duration: ${duration}

RULES:
- High-level overview only
- Focus on core ideas and terminology
- No deep explanations
- No long examples
- Must fit the selected duration

FORMAT (DO NOT CHANGE):
SECTION: Introduction
(2 short sentences)

SECTION: Core Concepts
- Point 1
- Point 2
- Point 3
- Point 4

SECTION: Summary
(1 strong concluding sentence)
`;
  }

  if (mode === "SINGLE") {
    return `
${LANGUAGE_RULES}

You are an expert instructor creating a COMPLETE learning video script.

Topic: ${topic}
Target Duration: ${duration}

STRICT RULES:
- This must be a FULL standalone lesson
- Write AT LEAST ${minWords} words
- Explain concepts slowly and clearly
- Teach as if the learner is a beginner
- Use real-world analogies
- Give multiple examples
- Avoid summaries
- This script will be spoken aloud

STRUCTURE:
- Use SECTION headings
- Each section should take 2–3 minutes when spoken
`;
  }

  // FULL COURSE (PART BY PART)
  return `
${LANGUAGE_RULES}

You are creating PART ${part} of a FULL COURSE.

Topic: ${topic}
Part: ${part}
Target Duration (for THIS PART): ${duration}

STRICT RULES:
- NOT a summary
- Write AT LEAST ${minWords} words
- Teach deeply and clearly
- Cover ONLY concepts for this part
- Do NOT repeat previous parts
- Assume learner completed Part ${part - 1}
- Spoken, verbose explanations required

STRUCTURE:
- Use SECTION headings
- Each section should take 2–3 minutes when spoken
`;
};

/* ---------------- GEMINI CALL ---------------- */

const callGemini = async (prompt) => {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Gemini API Error:", JSON.stringify(data, null, 2));
    throw new Error("Gemini API request failed");
  }

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || text.length < 200) {
    throw new Error("Gemini returned insufficient content");
  }

  return text;
};

/* ---------------- PUBLIC API ---------------- */

export const generateAIScript = async ({
  topic,
  duration,
  mode,
  part = 1,
  language = "en",
}) => {
  try {
    console.log(
      `🧠 Generating script | Mode: ${mode} | Duration: ${duration} | Part: ${part} | Language: ${language}`
    );

    const prompt = buildPrompt({
      topic,
      duration,
      mode,
      part,
      language,
    });

    const script = await callGemini(prompt);

    console.log(`✅ AI Script Generated (${script.length} chars)`);

    return script;
  } catch (error) {
    console.error("❌ Script Generation Error:", error.message);
    throw error;
  }
};
