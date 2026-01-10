import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const analyzeTopicSize = async (topic, duration) => {
  try {
    const prompt = `
      Analyze if the topic "${topic}" can be effectively taught in a video of duration "${duration}".
      
      If it is too complex for the duration, suggest splitting it into parts.
      
      Return ONLY a JSON object with this structure:
      {
        "feasible": boolean,
        "reason": "string explanation",
        "complexity": number (1-10),
        "estimatedParts": number (1 if feasible, >1 if it needs to be a full course)
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json|```/g, "").trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Analysis Error:", error);
    // Fallback if API fails
    return {
      feasible: true, // Default to true to not block user
      reason: "Analysis failed, defaulting to feasible.",
      complexity: 5,
      estimatedParts: 1
    };
  }
};