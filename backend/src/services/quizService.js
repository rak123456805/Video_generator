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

/* ---------------- QUIZ GENERATION ---------------- */

/**
 * Generate quiz questions based on video script content
 * @param {Object} params - Quiz generation parameters
 * @param {string} params.topic - The topic of the video
 * @param {Array} params.scriptSlides - Array of slide objects with narration
 * @param {string} params.language - Language code (en, hi, kn, ta, te, ml, bn, mr)
 * @param {number} params.questionCount - Number of questions to generate (default: 10)
 * @returns {Promise<Array>} Array of quiz question objects
 */
export const generateQuiz = async ({
    topic,
    scriptSlides = [],
    language = "en",
    questionCount = 10
}) => {
    // Combine all narration text from slides if available
    const hasSlides = Array.isArray(scriptSlides) && scriptSlides.length > 0;
    const fullContent = hasSlides
        ? scriptSlides
            .map((slide, index) => `Slide ${index + 1}: ${slide.title}\n${slide.narration}`)
            .join("\n\n")
        : "";

    const prompt = `
    You are an expert educational quiz creator.
    
    ${hasSlides 
        ? `Based on the following educational content about "${topic}", create a comprehensive quiz.`
        : `Create a comprehensive educational quiz on the topic "${topic}".`
    }
    
    ${hasSlides ? `CONTENT:\n${fullContent}` : ""}
    
    REQUIREMENTS:
    - Generate exactly ${questionCount} multiple-choice questions
    - Questions should cover the key concepts from the content
    - Mix difficulty levels: 30% easy, 50% medium, 20% hard
    - Each question must have exactly 4 options (A, B, C, D)
    - Only ONE option should be correct
    - Include a detailed explanation for the correct answer
    - ALL text (questions, options, explanations) MUST be in the language: ${language}
    - Questions should test understanding, not just memorization
    - Avoid questions that are too obvious or too obscure
    
    LANGUAGE CODES:
    - en: English
    - hi: Hindi (हिंदी)
    - kn: Kannada (ಕನ್ನಡ)
    - ta: Tamil (தமிழ்)
    - te: Telugu (తెలుగు)
    - ml: Malayalam (മലയാളം)
    - bn: Bengali (বাংলা)
    - mr: Marathi (मराठी)
    
    Return ONLY a JSON array where each object represents a question:
    [
      {
        "question": "What is the primary purpose of Python?",
        "options": [
          "A web browser",
          "A programming language",
          "An operating system",
          "A database"
        ],
        "correctAnswer": 1,
        "explanation": "Python is a high-level programming language designed for general-purpose programming. It's known for its simplicity and versatility.",
        "difficulty": "easy"
      }
    ]
    
    IMPORTANT:
    - "correctAnswer" is the index (0-3) of the correct option in the "options" array
    - "difficulty" must be one of: "easy", "medium", "hard"
    - Ensure questions are diverse and cover different aspects of the topic
    - Make distractors (wrong options) plausible but clearly incorrect
    - Explanations should educate and reinforce the concept
  `;

    try {
        console.log(`🧠 Generating quiz for "${topic}" in language: ${language}...`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON
        let quizData = [];
        try {
            quizData = JSON.parse(text);
        } catch (parseErr) {
            console.error("JSON Parsing failed, attempting cleanup...");
            const jsonStr = text.replace(/```json|```/g, "").trim();
            quizData = JSON.parse(jsonStr);
        }

        if (!Array.isArray(quizData)) {
            throw new Error("Gemini response is not an array");
        }

        // Validate quiz structure
        quizData.forEach((q, index) => {
            if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) {
                throw new Error(`Invalid question structure at index ${index}`);
            }
            if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
                throw new Error(`Invalid correctAnswer at index ${index}`);
            }
            if (!q.explanation) {
                throw new Error(`Missing explanation at index ${index}`);
            }
        });

        console.log(`✅ Generated ${quizData.length} quiz questions`);
        return quizData;

    } catch (err) {
        console.error("❌ Quiz Generation Error:", err);
        throw new Error("Failed to generate quiz: " + err.message);
    }
};
