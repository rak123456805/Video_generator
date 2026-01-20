/* src/controllers/quizController.js */

import { generateQuiz } from "../services/quizService.js";

/**
 * POST /api/quiz/generate
 * Generate quiz questions based on video script content
 */
export const generateQuizFromScript = async (req, res) => {
    try {
        const { topic, scriptSlides, language = "en", questionCount = 10 } = req.body;

        // Validation
        if (!topic || !topic.trim()) {
            return res.status(400).json({
                success: false,
                message: "Topic is required"
            });
        }

        if (!scriptSlides || !Array.isArray(scriptSlides) || scriptSlides.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Script slides are required and must be a non-empty array"
            });
        }

        // Validate language
        const supportedLanguages = ["en", "hi", "kn", "ta", "te", "ml", "bn", "mr"];
        if (!supportedLanguages.includes(language)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported language. Supported: ${supportedLanguages.join(", ")}`
            });
        }

        // Validate question count
        const count = parseInt(questionCount);
        if (isNaN(count) || count < 5 || count > 20) {
            return res.status(400).json({
                success: false,
                message: "Question count must be between 5 and 20"
            });
        }

        console.log(`📝 Generating quiz for topic: "${topic}" (${language})`);

        const quizQuestions = await generateQuiz({
            topic,
            scriptSlides,
            language,
            questionCount: count
        });

        res.json({
            success: true,
            topic,
            language,
            questionCount: quizQuestions.length,
            questions: quizQuestions
        });

    } catch (err) {
        console.error("Quiz generation error:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Failed to generate quiz"
        });
    }
};
