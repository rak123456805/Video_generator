import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

/* ---------------- ENV ---------------- */

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  throw new Error("GOOGLE_API_KEY not found in .env");
}

/* ---------------- GEMINI CONFIG ---------------- */

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json"
  }
});

/* ---------------- WORD TARGETS ---------------- */

const MIN_WORDS = {
  "15min": 1500,
  "30min": 3000,
  "1hr": 6000,
};

/* ---------------- PROMPT BUILDER ---------------- */

const buildPrompt = ({ topic, duration, mode, part, language }) => {
  const minWords = MIN_WORDS[duration] || 1500;

  return `
    You are an expert educational content creator.
    Create a video script for the topic: "${topic}".
    Duration Target: ${duration} (approx ${minWords} words).
    Mode: ${mode} (${mode === 'FULL' ? 'Part ' + part : 'Crash Course'}).
    Language: ${language} (Ensure script is in this language).

    Return ONLY a JSON array where each object represents a slide/scene:
    [
      {
        "title": "Short Slide Title",
        "bullets": ["Point 1", "Point 2"],
        "narration": "The spoken explanation for this slide...",
        "imagePrompt": "A detailed description of an image to visualize this concept"
      }
    ]

    Requirements:
    - The narration should be engaging, spoken-style, and educational.
    - Break content into logical slides.
    - "imagePrompt" should be in English, describing a visual aid (diagram, photo, or illustration).
    - Ensure the total word count of "narration" across all slides meets the target (~${minWords} words).
    - For "Full Course", cover deep details. For "Crash Course", summarize key concepts.
  `;
};

/* ---------------- GEMINI CALL ---------------- */

export const generateAIScript = async ({
  topic,
  duration,
  mode,
  part = 1,
  language = "en",
}) => {
  const prompt = buildPrompt({ topic, duration, mode, part, language });

  try {
    console.log(`🧠 Requesting structured script from Gemini for "${topic}"...`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON
    let scriptData = [];
    try {
      scriptData = JSON.parse(text);
    } catch (parseErr) {
      console.error("JSON Parsing failed, attempting cleanup...");
      const jsonStr = text.replace(/```json|```/g, "").trim();
      scriptData = JSON.parse(jsonStr);
    }

    if (!Array.isArray(scriptData)) {
      throw new Error("Gemini response is not an array");
    }

    // Add word counts for timing calculations
    scriptData = scriptData.map(slide => ({
      ...slide,
      wordCount: slide.narration.split(/\s+/).length
    }));

    return scriptData;
  } catch (err) {
    console.error("❌ Gemini Script Generation Error:", err);
    throw new Error("Failed to generate script: " + err.message);
  }
};
