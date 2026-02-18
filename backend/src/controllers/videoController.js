/* src/controllers/videoController.js */

import { analyzeTopicSize } from "../services/analysisService.js";
import { createJob, getJob } from "../services/jobStore.js";
import { runPipeline } from "../services/pipelineService.js";

/* ---------------- API HANDLERS ---------------- */

export const analyzeTopic = async (req, res) => {
  try {
    const { topic, duration } = req.body;
    const analysis = await analyzeTopicSize(topic, duration);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const generateCrashCourse = async (req, res) => {
  try {
    const { topic, duration, language = "en" } = req.body;

    // Create job with metadata
    const jobId = createJob({ topic, duration, mode: "CRASH", part: 1, language });
    console.log(`📋 Job created: ${jobId} for crash course "${topic}"`);

    // Respond immediately
    res.json({ success: true, jobId });

    // Fire-and-forget: run pipeline in background
    runPipeline({ topic, duration, mode: "CRASH", part: 1, language, jobId })
      .catch(err => console.error(`❌ Pipeline error (should be handled internally): ${err.message}`));

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generateFullCoursePart = async (req, res) => {
  try {
    const { topic, duration, part = 1, language = "en" } = req.body;

    // Get analysis for totalParts metadata
    let totalParts = 1;
    try {
      const analysis = await analyzeTopicSize(topic, duration);
      totalParts = analysis.estimatedParts || 1;
    } catch (e) {
      console.warn("Analysis for parts count failed, defaulting to 1");
    }

    // Create job with metadata
    const jobId = createJob({ topic, duration, mode: "FULL", part: Number(part), language, totalParts });
    console.log(`📋 Job created: ${jobId} for full course "${topic}" part ${part}`);

    // Respond immediately
    res.json({ success: true, jobId, totalParts });

    // Fire-and-forget: run pipeline in background
    runPipeline({ topic, duration, mode: "FULL", part: Number(part), language, jobId })
      .catch(err => console.error(`❌ Pipeline error (should be handled internally): ${err.message}`));

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- JOB STATUS ENDPOINT ---------------- */

export const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({
      success: true,
      jobId,
      status: job.overall_status,
      text_status: job.text_status,
      quiz_status: job.quiz_status,
      slide_status: job.slide_status,
      audio_status: job.audio_status,
      video_status: job.video_status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      meta: job.meta,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- QUIZ BY JOB ID ENDPOINT ---------------- */

export const getQuizByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.quiz_status === "completed" && job.result?.quiz) {
      return res.json({
        success: true,
        jobId,
        quiz_status: job.quiz_status,
        questions: job.result.quiz,
      });
    }

    if (job.quiz_status === "processing") {
      return res.json({
        success: true,
        jobId,
        quiz_status: "processing",
        questions: null,
      });
    }

    // Quiz failed or pending
    return res.json({
      success: true,
      jobId,
      quiz_status: job.quiz_status,
      questions: null,
      error: job.result?.quizError || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
