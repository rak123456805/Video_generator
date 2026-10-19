/* src/controllers/quizController.js */

import { generateQuiz } from "../services/quizService.js";
import { supabaseAdmin } from "../config/supabaseAdmin.js";

/**
 * POST /api/quiz/generate
 * Generate quiz questions based on video script content
 */
export const generateQuizFromScript = async (req, res) => {
    try {
        const {
            topic,
            scriptSlides,
            language = "en",
            questionCount = 10,
            previousQuestions = [],
            isNextQuiz = false,
            quizNumber = 2
        } = req.body;

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
        const count = parseInt(questionCount) || 10;
        if (isNaN(count) || count < 5 || count > 20) {
            return res.status(400).json({
                success: false,
                message: "Question count must be between 5 and 20"
            });
        }

        // Format topic for next quiz if applicable
        let finalTopic = topic.trim();
        if (isNextQuiz) {
            const num = quizNumber || 2;
            if (/(\(Quiz\s+\d+\)|- Quiz\s+\d+|\(Part\s+\d+\)|- Part\s+\d+)/i.test(finalTopic)) {
                finalTopic = finalTopic.replace(/(\(Quiz\s+\d+\)|- Quiz\s+\d+|\(Part\s+\d+\)|- Part\s+\d+)/i, `(Quiz ${num})`);
            } else {
                finalTopic = `${finalTopic} (Quiz ${num})`;
            }
        }

        console.log(`📝 Generating quiz for topic: "${finalTopic}" (${count} questions, ${language})`);

        const quizQuestions = await generateQuiz({
            topic: finalTopic,
            scriptSlides: slides,
            language,
            questionCount: count,
            previousQuestions,
            isNextQuiz,
            quizNumber: quizNumber || 2
        });

        // Save generated quiz to Supabase
        const quizId = `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
            const { error: dbErr } = await supabaseAdmin
                .from("quizzes")
                .insert({
                    id: quizId,
                    user_id: req.user?.id || null,
                    topic: finalTopic,
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
            topic: finalTopic,
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
        const { quizId, score, totalQuestions, topic } = req.body;

        if (!quizId || score === undefined || !totalQuestions) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        /* ---------------------------------------------------------------
         * FK Guard: ensure the quiz row exists in `quizzes` before we
         * insert into `quiz_results`.  This handles two edge cases:
         *   1. The on-the-fly quiz generation's DB insert failed silently,
         *      leaving a quizId the frontend knows about but that isn't in
         *      the table yet.
         *   2. The pipeline quiz upsert raced with the client submitting
         *      results before the pipeline finished.
         * We upsert a minimal stub (ignoreing conflicts) so the FK is
         * always satisfied without clobbering a real row.
         * --------------------------------------------------------------- */
        const { error: upsertErr } = await supabaseAdmin
            .from("quizzes")
            .upsert(
                {
                    id: quizId,
                    user_id: userId,
                    topic: topic || "Unknown",
                    questions: [],
                    created_at: new Date().toISOString(),
                },
                { onConflict: "id", ignoreDuplicates: true }
            );

        if (upsertErr) {
            // Non-fatal: log but continue — the real insert below will surface
            // the FK error with a clear message if the upsert truly failed.
            console.warn(`⚠️ quiz stub upsert failed (quiz_id=${quizId}):`, upsertErr.message);
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
        const userId = req.user?.id || null;
        let query = supabaseAdmin
            .from("quizzes")
            .select("id, topic, questions, created_at, user_id")
            .order("created_at", { ascending: false });

        if (userId) {
            query = query.or(`user_id.eq.${userId},user_id.is.null`);
        }

        let { data, error } = await query;
        if (error) throw new Error(error.message);

        // If user has no quizzes yet under their id, fallback to all quizzes so library isn't blank
        if ((!data || data.length === 0) && userId) {
            const fallback = await supabaseAdmin
                .from("quizzes")
                .select("id, topic, questions, created_at, user_id")
                .order("created_at", { ascending: false })
                .limit(50);
            if (!fallback.error && fallback.data) {
                data = fallback.data;
            }
        }

        const quizzes = (data || []).map((q) => ({
            id: q.id,
            topic: q.topic,
            questionCount: Array.isArray(q.questions) ? q.questions.length : 0,
            questions: q.questions || [],
            created_at: q.created_at,
            user_id: q.user_id,
        }));

        res.json({ success: true, quizzes });
    } catch (err) {
        console.error("Error listing quizzes:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/quiz/:id
 * Fetch a single quiz by ID
 */
export const getQuizById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from("quizzes")
            .select("id, topic, questions, created_at, user_id")
            .eq("id", id)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: "Quiz not found" });
        }

        res.json({
            success: true,
            quiz: {
                id: data.id,
                topic: data.topic,
                questions: data.questions || [],
                questionCount: Array.isArray(data.questions) ? data.questions.length : 0,
                created_at: data.created_at,
                user_id: data.user_id,
            }
        });
    } catch (err) {
        console.error("Error fetching quiz by ID:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * DELETE /api/quiz/:id
 * Delete a quiz by ID
 */
export const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from("quizzes")
            .delete()
            .eq("id", id);

        if (error) throw new Error(error.message);

        res.json({ success: true, message: "Quiz deleted successfully" });
    } catch (err) {
        console.error("Error deleting quiz:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

