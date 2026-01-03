import express from "express";
import { analyzeTopic ,generateCrashCourse,generateFullCoursePart
 } from "../controllers/videoController.js";

const router = express.Router();

router.post("/analyze", analyzeTopic);
router.post("/crash-course", generateCrashCourse);
router.post("/full-course/part", generateFullCoursePart);


export default router;
