/* src/controllers/quizController.js */

import { generateQuiz } from "../services/quizService.js";
import { supabaseAdmin } from "../config/supabaseAdmin.js";

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

        const slides = Array.isArray(scriptSlides) ? scriptSlides : [];

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
            scriptSlides: slides,
            language,
            questionCount: count
        });

        // Save generated quiz to Supabase
        const quizId = `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
            const { error: dbErr } = await supabaseAdmin
                .from("quizzes")
                .insert({
                    id: quizId,
                    user_id: req.user?.id || null,
                    topic: topic,
                    questions: quizQuestions,
                    created_at: new Date().toISOString()
                });
            if (dbErr) {
                console.warn("⚠️ Failed to store generated quiz in Supabase:", dbErr.message);
            } else {
                console.log(`✅ Generated quiz stored in Supabase under ID: ${quizId}`);
            }
        } catch (dbEx) {
            console.warn("⚠️ Supabase exception during generated quiz storage:", dbEx.message);
        }

        res.json({
            success: true,
            quizId,
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

/**
 * POST /api/quiz/result
 * Save a quiz result
 */
export const saveQuizResult = async (req, res) => {
    try {
        const userId = req.user.id;
        const { quizId, score, totalQuestions } = req.body;

        if (!quizId || score === undefined || !totalQuestions) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const percentage = Math.round((score / totalQuestions) * 100);
        let grade = "F";
        if (percentage >= 90) grade = "A+";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 70) grade = "B";
        else if (percentage >= 60) grade = "C";

        const { data, error } = await supabaseAdmin
            .from("quiz_results")
            .insert({
                user_id: userId,
                quiz_id: quizId,
                score,
                total_questions: totalQuestions,
                percentage,
                grade,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        res.json({ success: true, result: data });
    } catch (err) {
        console.error("Error saving quiz result:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/quiz/results
 * Fetch all quiz results for the user
 */
export const getQuizResults = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabaseAdmin
            .from("quiz_results")
            .select(`
                *,
                quizzes (
                    topic
                )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        res.json({ success: true, results: data });
    } catch (err) {
        console.error("Error fetching quiz results:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/quiz/stats
 * Get aggregated quiz statistics
 */
export const getQuizStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: results, error } = await supabaseAdmin
            .from("quiz_results")
            .select("percentage")
            .eq("user_id", userId);

        if (error) throw new Error(error.message);

        const totalTaken = results.length;
        let avgPercentage = 0;
        let avgGrade = "N/A";

        if (totalTaken > 0) {
            const sumPercentage = results.reduce((acc, r) => acc + Number(r.percentage), 0);
            avgPercentage = Math.round(sumPercentage / totalTaken);

            if (avgPercentage >= 90) avgGrade = "A+";
            else if (avgPercentage >= 80) avgGrade = "A";
            else if (avgPercentage >= 70) avgGrade = "B";
            else if (avgPercentage >= 60) avgGrade = "C";
            else avgGrade = "F";
        }

        res.json({
            success: true,
            stats: {
                totalTaken,
                avgPercentage,
                avgGrade
            }
        });
    } catch (err) {
        console.error("Error getting quiz stats:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/quiz/list
 * List all persistent quizzes
 */
export const listQuizzes = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("quizzes")
            .select("id, topic, created_at")
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        res.json({ success: true, quizzes: data });
    } catch (err) {
        console.error("Error listing quizzes:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
