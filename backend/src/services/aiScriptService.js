/* src/services/scriptService.js */

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Language + Script + Font awareness
 * (Fonts are used later by slide renderer)
 */
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateAIScript = async ({
  topic,
  duration,
  mode,
  part = 1,
  language = "en",
}) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
  });

  const lang =
    LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;

  /**
   * 🔒 HARD LANGUAGE ENFORCEMENT
   * This is the most important part for Indian languages
   */
  const languageInstruction = `
STRICT LANGUAGE RULES (MANDATORY):
- Write the ENTIRE output ONLY in ${lang.label}.
- Use ONLY ${lang.script} Unicode characters.
- DO NOT use English alphabets for native words.
- Do NOT mix languages (no Hinglish / Tanglish / Kanglish).
- Technical terms like CSS, HTML, Box Model may remain in English,
  but ALL explanations MUST be in ${lang.label}.
- Output must be UTF-8 compatible and suitable for ${lang.script} fonts.
`;

  let prompt = "";

  if (mode === "CRASH") {
    prompt = `
${languageInstruction}

You are creating a ${duration} CRASH COURSE on the topic:
"${topic}"

STRICT FORMAT RULES (DO NOT BREAK):
1. Use "SECTION:" exactly (uppercase).
2. Each section must have a clear title.
3. Bullet points must start with "-" only.
4. Maximum 4 bullet points per section.
5. Do NOT use markdown, emojis, or numbering.
6. Keep explanations concise but educational.

REQUIRED STRUCTURE:

SECTION: ಪರಿಚಯ / Introduction (translated to ${lang.label})
(2 short sentences explaining what the learner will gain)

SECTION: ಪ್ರಮುಖ ಸಂकल्पನೆಗಳು / Core Concepts (translated)
- Bullet 1 in ${lang.label}
- Bullet 2 in ${lang.label}
- Bullet 3 in ${lang.label}
- Bullet 4 in ${lang.label}

SECTION: ಸಾರಾಂಶ / Summary (translated)
(1 strong concluding sentence in ${lang.label})
`;
  } else {
    prompt = `
${languageInstruction}

You are an expert instructor teaching a FULL COURSE on:
"${topic}"

This is PART ${part} of the course.

STRICT FORMAT RULES:
1. Use "SECTION:" exactly.
2. Bullet points must start with "-".
3. Maximum 4 bullet points per section.
4. No markdown, no numbering.

REQUIRED STRUCTURE:

SECTION: ಭಾಗ ${part} ಪರಿಚಯ / Part ${part} Overview (translated)
(Brief explanation in ${lang.label})

SECTION: ವಿವರವಾದ ವಿವರಣೆ / Detailed Explanation (translated)
- Bullet 1 in ${lang.label}
- Bullet 2 in ${lang.label}
- Bullet 3 in ${lang.label}
- Bullet 4 in ${lang.label}

SECTION: ಮುಂದಿನ ಹಂತಗಳು / Next Steps (translated)
- One teaser bullet in ${lang.label} for the next part
`;
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const scriptText = response.text();

    if (!scriptText || scriptText.trim().length < 100) {
      throw new Error("AI returned empty or invalid script");
    }

    console.log(
      `✅ Script generated in ${lang.label} (${lang.script})`
    );

    return scriptText;
  } catch (error) {
    console.error(
      "❌ AI Script Generation Error:",
      error.message
    );
    throw new Error("Failed to generate AI script");
  }
};
