import express from "express";
import {
  analyzeTopic,
  generateCrashCourse,
  generateFullCoursePart,
} from "../controllers/videoController.js";

const router = express.Router();

/* STEP 1: ANALYZE */
router.post("/analyze", analyzeTopic);

/* STEP 2: GENERATION */
router.post("/crash-course", generateCrashCourse);
router.post("/full-course/part", generateFullCoursePart);

export default router;
