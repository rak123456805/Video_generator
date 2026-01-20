/* src/routes/quizRoutes.js */

import express from "express";
import { generateQuizFromScript } from "../controllers/quizController.js";

const router = express.Router();

/**
 * POST /generate
 * Generate quiz questions based on video script content
 */
router.post("/generate", generateQuizFromScript);

export default router;
