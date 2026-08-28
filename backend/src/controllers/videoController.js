/* src/controllers/videoController.js */

import { analyzeTopicSize } from "../services/analysisService.js";
import { createJob, getJob, getAllJobs } from "../services/jobStore.js";
import { runPipeline } from "../services/pipelineService.js";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { getAuthClientFromEncryptedToken, listVideosInDrive } from "../services/googleDriveService.js";
import { rankSentences, planScenesWithTextRank } from "../services/textRankService.js";

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

    // req.user is set by authenticateOptional middleware (null if not authenticated)
    const userId = req.user?.id || null;

    // Create job with metadata — userId included for Drive upload
    const jobId = createJob({ topic, duration, mode: "CRASH", part: 1, language, userId });
    console.log(`📋 Job created: ${jobId} for crash course "${topic}" (userId: ${userId || "anonymous"})`);

    // Respond immediately
    res.json({ success: true, jobId });

    // Fire-and-forget: run pipeline in background
    runPipeline({ topic, duration, mode: "CRASH", part: 1, language, jobId, userId })
      .catch(err => console.error(`❌ Pipeline error (should be handled internally): ${err.message}`));

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generateFullCoursePart = async (req, res) => {
  try {
    const { topic, duration, part = 1, language = "en" } = req.body;

    // req.user is set by authenticateOptional middleware (null if not authenticated)
    const userId = req.user?.id || null;

    // Get analysis for totalParts metadata
    let totalParts = 1;
    try {
      const analysis = await analyzeTopicSize(topic, duration);
      totalParts = analysis.estimatedParts || 1;
    } catch (e) {
      console.warn("Analysis for parts count failed, defaulting to 1");
    }

    // Create job with metadata — userId included for Drive upload
    const jobId = createJob({ topic, duration, mode: "FULL", part: Number(part), language, totalParts, userId });
    console.log(`📋 Job created: ${jobId} for full course "${topic}" part ${part} (userId: ${userId || "anonymous"})`);

    // Respond immediately
    res.json({ success: true, jobId, totalParts });

    // Fire-and-forget: run pipeline in background
    runPipeline({ topic, duration, mode: "FULL", part: Number(part), language, jobId, userId })
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

    // 1. Try fetching from Supabase first
    try {
      const { data: quizRecord, error: dbErr } = await supabaseAdmin
        .from("quizzes")
        .select("questions, topic")
        .eq("id", jobId)
        .single();
        
      if (quizRecord && !dbErr) {
        return res.json({
          success: true,
          jobId,
          quiz_status: "completed",
          questions: quizRecord.questions,
          topic: quizRecord.topic
        });
      }
    } catch (dbEx) {
      console.warn("⚠️ Failed to fetch quiz from Supabase:", dbEx.message);
    }

    // 2. Fallback to local job store
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
/* ── Helper: Parse topic from standard filename structure ── */
function parseTopicFromFilename(filename) {
  const clean = filename.replace(/\.mp4$/i, "");
  const parts = clean.split("-");
  if (parts.length >= 5 && (parts[0] === "crash" || parts[0] === "full")) {
    const topicParts = parts.slice(1, parts.length - 3);
    return topicParts.join(" ");
  }
  return clean;
}

/* ---------------- LIST ALL COMPLETED VIDEOS ENDPOINT ---------------- */

export const listVideos = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const allJobs = getAllJobs();
    
    // 1. Get completed local server jobs
    const filteredJobs = allJobs.filter((job) => {
      const jobUserId = job.meta?.userId || job.userId || null;
      return jobUserId === userId;
    });

    const completedLocal = filteredJobs
      .filter((job) => job.overall_status === "completed" && job.result?.finalVideo)
      .map((job) => ({
        jobId: job.id,
        topic: job.meta?.topic || "Untitled",
        language: job.meta?.language || "en",
        mode: job.result?.mode || job.meta?.mode || "CRASH",
        part: job.result?.part || job.meta?.part || 1,
        isFullCourse: (job.result?.mode || job.meta?.mode) === "FULL",
        finalVideo: job.result.finalVideo,
        driveFileId: job.result.driveFileId || null,
        driveFileUrl: job.result.driveFileUrl || null,
        driveUploaded: !!job.result.driveFileUrl,
        createdAt: job.createdAt,
      }));

    // 2. If authenticated, fetch files directly from connected Google Drive
    let driveVideos = [];
    if (userId) {
      try {
        const { data: connection } = await supabaseAdmin
          .from("google_drive_connections")
          .select("encrypted_refresh_token, drive_folder_id")
          .eq("user_id", userId)
          .single();

        if (connection && connection.encrypted_refresh_token && connection.drive_folder_id) {
          const oauth2Client = await getAuthClientFromEncryptedToken(connection.encrypted_refresh_token);
          const driveFiles = await listVideosInDrive(oauth2Client, connection.drive_folder_id);

          driveVideos = driveFiles.map((file) => {
            const topic = parseTopicFromFilename(file.name);
            const isFullCourse = file.name.startsWith("full-");

            let part = 1;
            const match = file.name.match(/-p(\d+)-/);
            if (match) part = Number(match[1]);

            return {
              jobId: `drive-${file.id}`,
              topic,
              language: "en",
              mode: isFullCourse ? "FULL" : "CRASH",
              part,
              isFullCourse,
              finalVideo: file.webContentLink || file.webViewLink, // direct download or preview link
              driveFileId: file.id,
              driveFileUrl: file.webViewLink,
              driveUploaded: true,
              createdAt: new Date(file.createdTime).getTime(),
            };
          });
        }
      } catch (driveErr) {
        console.warn("⚠️ Failed to load Google Drive videos for list:", driveErr.message);
      }
    }

    // 3. Combine and deduplicate
    const combined = [...completedLocal, ...driveVideos];
    const seen = new Set();
    const deduplicated = [];

    for (const video of combined) {
      // Deduplicate by driveFileId if present, otherwise by topic/mode/part
      const key = video.driveFileId 
        ? `drive-${video.driveFileId}` 
        : `local-${video.topic}-${video.mode}-${video.part}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(video);
      }
    }

    // Sort newest first
    deduplicated.sort((a, b) => b.createdAt - a.createdAt);

    res.json({ success: true, videos: deduplicated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- TEXTRANK ANALYSIS ENDPOINT ---------------- */

/**
 * POST /api/video/text-rank/analyze
 * Standalone TextRank NLP endpoint for development, inspection, and testing.
 */
export const analyzeTextRank = async (req, res) => {
  try {
    const { text, sentences, scriptSlides, threshold, damping } = req.body;

    if (scriptSlides && Array.isArray(scriptSlides)) {
      const enrichedSlides = planScenesWithTextRank(scriptSlides, { threshold, damping });
      return res.json({
        success: true,
        totalScenes: enrichedSlides.length,
        enrichedSlides,
      });
    }

    const input = text || sentences;
    if (!input || (typeof input === "string" && !input.trim()) || (Array.isArray(input) && input.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Please provide non-empty 'text', 'sentences', or 'scriptSlides' in the request body.",
      });
    }

    const result = rankSentences(input, { threshold, damping });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("TextRank analyze error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
