/* src/routes/videoRoutes.js */

import express from "express";
import {
  analyzeTopic,
  generateCrashCourse,
  generateFullCoursePart
} from "../controllers/videoController.js";

const router = express.Router();

/**
 * POST /analyze
 * Check if the topic can be taught in the given duration.
 */
router.post("/analyze", analyzeTopic);

/**
 * POST /crash-course
 * Generate a concise summary video.
 */
router.post("/crash-course", generateCrashCourse);

/**
 * POST /full-course/part
 * Generate a specific part of a detailed course series.
 */
router.post("/full-course/part", generateFullCoursePart);

export default router;
