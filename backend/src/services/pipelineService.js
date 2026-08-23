/* src/services/pipelineService.js — Dependency-driven async pipeline */

import path from "path";
import fs from "fs";
import { generateAIScript } from "./scriptService.js";
import { generateSpeech } from "./tts/index.js";
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
           ================================================================ */
        console.log(`🎬 [${jobId}] Pipeline started: ${mode} - ${topic}`);
        updateJob(jobId, {
            text_status: "processing",
            progress: "Generating script...",
        });

        const scriptSlides = await generateAIScript({ topic, duration, mode, part, language });

        if (!scriptSlides || scriptSlides.length === 0) {
            throw new Error("Script generation returned empty result");
        }

        updateJob(jobId, {
            text_status: "completed",
            progress: "Script ready — starting parallel generation...",
            result: { scriptSlides },
        });
        console.log(`✅ [${jobId}] Text generation completed (${scriptSlides.length} slides)`);

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
            quizData = await generateQuiz({ topic, scriptSlides, language, questionCount: 10 });
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
        const slidePaths = await generateSlides(scriptSlides, slideFolder, language);
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
        const audioPath = await generateSpeech(fullNarration, audioFile, language);
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

        const silentVideoPath = await generateVideoFromSlides(
            slideDirPath,
            silentVideo,
            slideDurations
        );

        if (!(await ensureFileExists(silentVideoPath))) {
            throw new Error("Silent video generation failed");
        }

        updateJob(jobId, { progress: "Merging audio and video..." });
        const finalOutputPath = path.join(process.cwd(), "generated", finalVideo);
        await mergeVideoAndAudio(silentVideoPath, audioPath, finalOutputPath);

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

    } catch (err) {
        console.error(`❌ [${jobId}] Pipeline failed:`, err.message);
        updateJob(jobId, {
            overall_status: "failed",
            progress: "Generation failed",
            error: err.message,
        });
    }
}
