/* src/services/pipelineService.js — Dependency-driven async pipeline
 *
 * Changes vs original:
 *  - TTS import now points at tts/engine.js (msedge-tts) instead of tts/index.js (google-tts-api)
 *  - Added withTimeout() helper — rejects with a descriptive error after ms elapsed
 *  - Every major pipeline stage is wrapped with a sensible timeout so a stalled
 *    network call or FFmpeg hang results in a clean "failed" job status instead of
 *    hanging the dyno indefinitely.
 */

import path from "path";
import fs from "fs";
import { generateAIScript } from "./scriptService.js";
import { planScenesWithTextRank } from "./textRankService.js";
/* FIX 2b: Use engine.js (msedge-tts) as the single TTS source of truth.
   Previously this imported tts/index.js which used the deprecated google-tts-api. */
import { generateSpeech } from "./tts/engine.js";
import { generateSlides } from "./slideService.js";
import { generateVideoFromSlides } from "./slideVideoService.js";
import { getAudioDuration } from "./audioService.js";
import { mergeVideoAndAudio } from "./videoMergeService.js";
import { generateQuiz } from "./quizService.js";
import { updateJob } from "./jobStore.js";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  getAuthClientFromEncryptedToken,
  getOrCreateTextToVideoFolder,
  uploadVideoToDrive,
} from "./googleDriveService.js";

/* ---------- FIX 3: Stage-level timeout helper ----------
 *
 * Races `promise` against a timer.  If the timer fires first it rejects with
 * a message like "Script generation timed out after 90s", which the catch block
 * at the bottom of runPipeline() will pick up and store as job.error — giving
 * the frontend a clear, human-readable failure reason instead of infinite spinner.
 */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
        ms
      )
    ),
  ]);
}

/* ---------- Helpers ---------- */

const ensureFileExists = async (filePath, timeout = 120000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) return true;
        await new Promise(r => setTimeout(r, 2000));
    }
    return false;
};

/* ---------- Google Drive Upload Helper ---------- */

/**
 * Attempts to upload the final video to the user's Google Drive.
 * If the user has no Drive connection or any error occurs, it logs a warning
 * and continues gracefully — the video stays available on the server.
 *
 * @param {string} userId       - Supabase user ID (may be null for anonymous)
 * @param {string} finalOutputPath - absolute path to the merged video file
 * @param {string} finalVideo   - filename (e.g. "crash-python-final.mp4")
 * @param {string} jobId        - for logging
 * @returns {{ driveFileId, driveFileUrl } | null}
 */
async function uploadToDriveIfConnected(userId, finalOutputPath, finalVideo, jobId) {
    if (!userId) {
        console.log(`ℹ️  [${jobId}] No userId — skipping Drive upload.`);
        return null;
    }

    try {
        // Check if user has a Drive connection
        const { data: connection, error } = await supabaseAdmin
            .from("google_drive_connections")
            .select("encrypted_refresh_token, drive_folder_id, google_email")
            .eq("user_id", userId)
            .single();

        if (error || !connection) {
            console.log(`ℹ️  [${jobId}] No Google Drive connection for user ${userId} — skipping upload.`);
            return null;
        }

        console.log(`☁️  [${jobId}] Uploading video to Google Drive for ${connection.google_email}...`);

        // Build authenticated Drive client (refreshes access token internally)
        const oauth2Client = await getAuthClientFromEncryptedToken(connection.encrypted_refresh_token);

        // Reuse stored folder ID or recreate if needed
        let folderId = connection.drive_folder_id;
        if (!folderId) {
            folderId = await getOrCreateTextToVideoFolder(oauth2Client);
            // Update the stored folder ID
            await supabaseAdmin
                .from("google_drive_connections")
                .update({ drive_folder_id: folderId, updated_at: new Date().toISOString() })
                .eq("user_id", userId);
        }

        // Upload the video with retries (robust against transient network/SSL drops)
        let driveResult = null;
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                driveResult = await uploadVideoToDrive(
                    oauth2Client,
                    folderId,
                    finalOutputPath,
                    finalVideo
                );
                break; // Success! Exit loop.
            } catch (uploadErr) {
                console.warn(`⚠️  [${jobId}] Drive upload attempt ${attempt}/${maxRetries} failed: ${uploadErr.message}`);
                if (attempt === maxRetries) {
                    throw uploadErr; // Exhausted all retries, throw the error
                }
                // Wait before retrying (2s, 4s)
                const delay = attempt * 2000;
                console.log(`⏳ Retrying Drive upload in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        console.log(`✅ [${jobId}] Drive upload complete: ${driveResult.driveFileUrl}`);
        return { driveFileId: driveResult.driveFileId, driveFileUrl: driveResult.driveFileUrl };

    } catch (err) {
        // Non-fatal: Drive upload failure should not fail the video generation
        console.error(`⚠️  [${jobId}] Drive upload failed (non-critical):`, err.message);

        // If it's a token error, mark the connection as requiring reconnect
        if (err.message?.includes("invalid_grant") || err.message?.includes("Token has been expired")) {
            console.warn(`⚠️  [${jobId}] Google Drive token expired for user ${userId}. User must reconnect.`);
            // We don't delete the connection here — let status endpoint detect & report it
        }

        return null;
    }
}

/* ---------- Pipeline Orchestrator ---------- */

/**
 * Runs the full generation pipeline with dependency-driven parallelism:
 *
 *   text_generation
 *        │
 *        ├── quiz_generation    (parallel, non-critical)
 *        ├── slide_generation   (parallel)
 *        └── audio_generation   (parallel)
 *               │         │
 *               └────┬────┘
 *                    │
 *             video_generation  (after slides + audio)
 *                    │
 *             drive_upload      (after video, non-critical)
 */
export async function runPipeline({ topic, duration, mode, part = 1, language = "en", jobId, userId = null }) {
    const timestamp = Date.now();
    const safeTopic = topic.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");

    const slideFolder = `folder-${mode.toLowerCase()}-${safeTopic}-${language}-p${part}-${timestamp}`;
    const audioFile = `audio-${mode.toLowerCase()}-${safeTopic}-${language}-p${part}-${timestamp}.mp3`;
    const silentVideo = `silent-${timestamp}.mp4`;
    const finalVideo = `${mode.toLowerCase()}-${safeTopic}-${language}-p${part}-final.mp4`;

    try {
        /* ================================================================
           STEP 1: TEXT / SCRIPT GENERATION
           Timeout: 90 s — Gemini can be slow under load but should never
           take more than a minute and a half for a structured response.
           ================================================================ */
        console.log(`🎬 [${jobId}] Pipeline started: ${mode} - ${topic}`);
        updateJob(jobId, {
            text_status: "processing",
            progress: "Generating script...",
        });

        const rawScriptSlides = await withTimeout(
            generateAIScript({ topic, duration, mode, part, language }),
            90_000,
            "Script generation"
        );

        if (!rawScriptSlides || rawScriptSlides.length === 0) {
            throw new Error("Script generation returned empty result");
        }

        // Apply TextRank NLP algorithm for intelligent scene planning & concept ranking
        console.log(`🧠 [${jobId}] Applying TextRank NLP algorithm for scene planning...`);
        const scriptSlides = planScenesWithTextRank(rawScriptSlides);

        updateJob(jobId, {
            text_status: "completed",
            progress: "Script & TextRank analysis ready — starting generation...",
            result: { scriptSlides },
        });
        console.log(`✅ [${jobId}] Text generation & TextRank planning completed (${scriptSlides.length} slides)`);

        /* ================================================================
           STEP 2: SEQUENTIAL — Quiz -> Slides -> Audio
           On 512MB Free instances (Render), we MUST run these sequentially
           to avoid OOM (Out of Memory) crashes caused by running Puppeteer,
           Python and FFmpeg simultaneously.
           ================================================================ */

        // --- Quiz (non-critical) ---
        let quizData = [];
        try {
            updateJob(jobId, { quiz_status: "processing", progress: "Generating quiz..." });
            console.log(`🧠 [${jobId}] Quiz generation started`);

            // Timeout: 60 s — quiz generation is a single Gemini call
            quizData = await withTimeout(
                generateQuiz({ topic, scriptSlides, language, questionCount: 10 }),
                60_000,
                "Quiz generation"
            );
            
            // Persist quiz to Supabase
            try {
                const { error: dbErr } = await supabaseAdmin
                    .from("quizzes")
                    .upsert({
                        id: jobId,
                        user_id: userId || null,
                        topic: topic,
                        questions: quizData,
                        created_at: new Date().toISOString()
                    });
                if (dbErr) {
                    console.warn(`⚠️ [${jobId}] Failed to persist quiz to Supabase:`, dbErr.message);
                } else {
                    console.log(`✅ [${jobId}] Quiz persisted to Supabase database`);
                }
            } catch (dbEx) {
                console.warn(`⚠️ [${jobId}] Supabase quiz persistence exception:`, dbEx.message);
            }

            updateJob(jobId, {
                quiz_status: "completed",
                result: { quiz: quizData },
            });
            console.log(`✅ [${jobId}] Quiz generation completed (${quizData.length} questions)`);
        } catch (err) {
            console.error(`⚠️ [${jobId}] Quiz generation failed (non-critical):`, err.message);
            updateJob(jobId, {
                quiz_status: "failed",
                result: { quizError: err.message },
            });
        }

        // --- Slides (critical) ---
        updateJob(jobId, { slide_status: "processing", progress: "Rendering slides..." });
        console.log(`🖼️ [${jobId}] Slide generation started`);

        // Timeout: 5 s per slide (Puppeteer screenshot), minimum 60 s, maximum 300 s
        const slideTimeoutMs = Math.min(300_000, Math.max(60_000, scriptSlides.length * 5_000));
        console.log(`⏱️  [${jobId}] Slide timeout: ${slideTimeoutMs / 1000}s for ${scriptSlides.length} slides`);

        const slidePaths = await withTimeout(
            generateSlides(scriptSlides, slideFolder, language),
            slideTimeoutMs,
            "Slide rendering"
        );
        if (!slidePaths.length) throw new Error("Slide rendering failed");
        updateJob(jobId, {
            slide_status: "completed",
            result: { slideFolder },
        });
        console.log(`✅ [${jobId}] Slide generation completed (${slidePaths.length} slides)`);

        // --- Audio / TTS (critical) ---
        updateJob(jobId, { audio_status: "processing", progress: "Generating audio..." });
        console.log(`🎙️ [${jobId}] Audio generation started`);
        const fullNarration = scriptSlides.map(s => s.narration).join("\n\n");

        // Timeout: 10 min — conservative ceiling for large scripts (15 min lesson ≈ 2250 words ≈ 6 chunks)
        // Each chunk has its own 30 s timeout inside engine.js; this outer timeout is a safety net.
        const audioPath = await withTimeout(
            generateSpeech(fullNarration, audioFile, language),
            600_000,
            "Audio generation"
        );
        if (!(await ensureFileExists(audioPath))) {
            throw new Error("Audio generation failed — file not found");
        }
        updateJob(jobId, {
            audio_status: "completed",
            result: { audioFile },
        });
        console.log(`✅ [${jobId}] Audio generation completed`);

        /* ================================================================
           STEP 3: VIDEO GENERATION (after slides + audio)
           ================================================================ */
        updateJob(jobId, {
            video_status: "processing",
            progress: "Calculating slide timings...",
        });

        const audioDuration = await getAudioDuration(audioPath);

        // Calculate per-slide durations based on word counts
        const totalWords = scriptSlides.reduce((sum, s) => sum + (s.wordCount || 0), 0);
        let accumulatedDuration = 0;
        const slideDurations = scriptSlides.map((s, i) => {
            if (i === scriptSlides.length - 1) {
                return Math.max(3, audioDuration - accumulatedDuration);
            }
            const ratio = (s.wordCount || 0) / (totalWords || 1);
            const dur = Math.max(3, audioDuration * ratio);
            accumulatedDuration += dur;
            return dur;
        });

        updateJob(jobId, { progress: "Rendering video from slides..." });
        const slideDirPath = path.join(process.cwd(), "generated", slideFolder);

        // Timeout: scale with audio duration — FFmpeg needs at least ~5× realtime for
        // encoding stills at 30fps on a slow/shared server.  Floor: 3 min, ceiling: 15 min.
        const videoEncodeTimeoutMs = Math.min(900_000, Math.max(180_000, audioDuration * 5_000));
        console.log(`⏱️  [${jobId}] Video encoding timeout: ${Math.round(videoEncodeTimeoutMs / 1000)}s (audio is ${Math.round(audioDuration)}s)`);

        const silentVideoPath = await withTimeout(
            generateVideoFromSlides(slideDirPath, silentVideo, slideDurations),
            videoEncodeTimeoutMs,
            "Video encoding"
        );

        if (!(await ensureFileExists(silentVideoPath))) {
            throw new Error("Silent video generation failed");
        }

        updateJob(jobId, { progress: "Merging audio and video..." });
        const finalOutputPath = path.join(process.cwd(), "generated", finalVideo);

        // Timeout: scale with audio duration — muxing needs at least ~2× realtime.
        // Floor: 2 min, ceiling: 8 min.
        const mergeTimeoutMs = Math.min(480_000, Math.max(120_000, audioDuration * 2_000));
        console.log(`⏱️  [${jobId}] Audio/video merge timeout: ${Math.round(mergeTimeoutMs / 1000)}s`);

        await withTimeout(
            mergeVideoAndAudio(silentVideoPath, audioPath, finalOutputPath),
            mergeTimeoutMs,
            "Audio/video merge"
        );

        /* ================================================================
           STEP 4: GOOGLE DRIVE UPLOAD (after video is merged)
           Non-critical — failure does not affect video availability.
           ================================================================ */
        let driveResult = null;
        if (userId) {
            updateJob(jobId, { progress: "Uploading to Google Drive..." });
            driveResult = await uploadToDriveIfConnected(userId, finalOutputPath, finalVideo, jobId);
        }

        /* ================================================================
           DONE
           ================================================================ */
        updateJob(jobId, {
            video_status: "completed",
            overall_status: "completed",
            progress: driveResult ? "Video ready and saved to Google Drive!" : "Video ready!",
            result: {
                finalVideo: `/generated/${finalVideo}`,
                part,
                duration,
                mode,
                // Drive metadata (null if Drive not connected or upload failed)
                driveFileId: driveResult?.driveFileId || null,
                driveFileUrl: driveResult?.driveFileUrl || null,
                driveUploaded: !!driveResult,
            },
        });

        console.log(`🎉 [${jobId}] Pipeline completed successfully!${driveResult ? " (saved to Drive)" : ""}`);

    } catch (rawErr) {
        // Normalise to Error so .message is always a string, even if a stage
        // threw a raw string, plain object, or undefined (e.g. msedge-tts).
        const err = rawErr instanceof Error
            ? rawErr
            : new Error(String(rawErr?.message ?? rawErr ?? "Unknown pipeline error"));

        console.error(`❌ [${jobId}] Pipeline failed:`, err.message);
        updateJob(jobId, {
            overall_status: "failed",
            progress: "Generation failed",
            error: err.message,
        });
    }
}
