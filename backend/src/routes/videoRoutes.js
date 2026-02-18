/* src/routes/videoRoutes.js */

import express from "express";
import {
  analyzeTopic,
  generateCrashCourse,
  generateFullCoursePart,
  getJobStatus,
  getQuizByJobId,
} from "../controllers/videoController.js";

const router = express.Router();

/**
 * POST /analyze
 * Check if the topic can be taught in the given duration.
 */
router.post("/analyze", analyzeTopic);

/**
 * POST /crash-course
 * Generate a concise summary video (async — returns jobId).
 */
router.post("/crash-course", generateCrashCourse);

/**
 * POST /full-course/part
 * Generate a specific part of a detailed course series (async — returns jobId).
 */
router.post("/full-course/part", generateFullCoursePart);

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

export default router;
