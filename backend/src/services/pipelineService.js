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

/* ---------- Helpers ---------- */

const ensureFileExists = async (filePath, timeout = 120000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) return true;
        await new Promise(r => setTimeout(r, 2000));
    }
    return false;
};

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
 */
export async function runPipeline({ topic, duration, mode, part = 1, language = "en", jobId }) {
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
           DONE
           ================================================================ */
        updateJob(jobId, {
            video_status: "completed",
            overall_status: "completed",
            progress: "Video ready!",
            result: {
                finalVideo: `/generated/${finalVideo}`,
                part,
                duration,
                mode,
            },
        });

        console.log(`🎉 [${jobId}] Pipeline completed successfully!`);

    } catch (err) {
        console.error(`❌ [${jobId}] Pipeline failed:`, err.message);
        updateJob(jobId, {
            overall_status: "failed",
            progress: "Generation failed",
            error: err.message,
        });
    }
}
