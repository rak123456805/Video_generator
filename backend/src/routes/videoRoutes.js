/* src/routes/videoRoutes.js */

import express from "express";
import {
  analyzeTopic,
  generateCrashCourse,
  generateFullCoursePart,
  getJobStatus,
  getQuizByJobId,
  listVideos,
  analyzeTextRank,
} from "../controllers/videoController.js";
import { authenticateOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * POST /analyze
 * Check if the topic can be taught in the given duration.
 */
router.post("/analyze", analyzeTopic);

/**
 * POST /crash-course
 * Generate a concise summary video (async — returns jobId).
 * Optional auth: if a valid Supabase token is present, userId is attached
 * so the pipeline can auto-upload to the user's Google Drive.
 */
router.post("/crash-course", authenticateOptional, generateCrashCourse);

/**
 * POST /full-course/part
 * Generate a specific part of a detailed course series (async — returns jobId).
 * Optional auth: same Drive upload behavior as crash-course.
 */
router.post("/full-course/part", authenticateOptional, generateFullCoursePart);

/**
 * GET /status/:jobId
 * Poll the status of an async generation job (per-component statuses).
 */
router.get("/status/:jobId", getJobStatus);

/**
 * GET /quiz/:jobId
 * Fetch the quiz for a job (read-only — never regenerates).
 */
router.get("/quiz/:jobId", getQuizByJobId);

/**
 * GET /list
 * Return completed video jobs for the authenticated user (or anonymous if not logged in).
 */
router.get("/list", authenticateOptional, listVideos);

/**
 * POST /text-rank/analyze or POST /analyze-textrank
 * Standalone TextRank NLP analysis route for testing and evaluation.
 */
router.post("/text-rank/analyze", analyzeTextRank);
router.post("/analyze-textrank", analyzeTextRank);

export default router;
