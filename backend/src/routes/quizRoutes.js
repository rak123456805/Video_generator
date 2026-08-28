import express from "express";
import { 
  generateQuizFromScript,
  saveQuizResult,
  getQuizResults,
  getQuizStats,
  listQuizzes
} from "../controllers/quizController.js";
import { authenticate, authenticateOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * POST /generate
 * Generate quiz questions based on video script content
 */
router.post("/generate", authenticateOptional, generateQuizFromScript);

/**
 * POST /result
 * Save a quiz result
 */
router.post("/result", authenticate, saveQuizResult);

/**
 * GET /results
 * Fetch all quiz results for the user
 */
router.get("/results", authenticate, getQuizResults);

/**
 * GET /stats
 * Fetch quiz statistics (total taken, average score, average grade)
 */
router.get("/stats", authenticate, getQuizStats);

/**
 * GET /list
 * List all available quizzes
 */
router.get("/list", authenticate, listQuizzes);

export default router;
