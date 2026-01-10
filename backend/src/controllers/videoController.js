/* src/controllers/videoController.js */

import path from "path";
import fs from "fs";
import { analyzeTopicSize } from "../services/analysisService.js";
import { generateAIScript } from "../services/scriptService.js";
import { generateSpeech } from "../services/tts/index.js";
import { generateSlides } from "../services/slideService.js";
import { generateVideoFromSlides } from "../services/slideVideoService.js";
import { getAudioDuration } from "../services/audioService.js";
import { mergeVideoAndAudio } from "../services/videoMergeService.js";

/* ---------------- UTILS ---------------- */

const ensureFileExists = async (filePath, timeout = 120000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) return true;
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
};

/* ---------------- CORE GENERATOR ---------------- */

const processVideoGeneration = async ({
  topic,
  duration,
  mode,
  part = 1,
  language = "en",
}) => {
  const timestamp = Date.now();
  const safeTopic = topic.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");

  const slideFolder = `folder-${mode.toLowerCase()}-${safeTopic}-${language}-p${part}-${timestamp}`;
  const audioFile = `audio-${mode.toLowerCase()}-${safeTopic}-${language}-p${part}-${timestamp}.mp3`;
  const silentVideo = `silent-${timestamp}.mp4`;
  const finalVideo = `${mode.toLowerCase()}-${safeTopic}-${language}-p${part}-final.mp4`;

  console.log(`🎬 Starting video process: ${mode} - ${topic}`);

  /* -------- STEP 1: SCRIPT (Returns Array of Slides) -------- */
  const scriptSlides = await generateAIScript({
    topic,
    duration,
    mode,
    part,
    language,
  });

  if (!scriptSlides || scriptSlides.length === 0) {
    throw new Error("Script generation returned empty result");
  }

  /* -------- STEP 2: SLIDES -------- */
  // Pass the array directly. slideService > scriptToSlides handles the array.
  const slidePaths = await generateSlides(scriptSlides, slideFolder, language);
  if (!slidePaths.length) throw new Error("Slide rendering failed");

  /* -------- STEP 3: AUDIO -------- */
  // Concatenate narration for TTS
  const fullNarration = scriptSlides.map(s => s.narration).join("\n\n");

  const audioPath = await generateSpeech(fullNarration, audioFile, language);
  if (!(await ensureFileExists(audioPath))) {
    throw new Error("Audio generation failed");
  }

  const audioDuration = await getAudioDuration(audioPath);

  /* -------- STEP 4: TIMING -------- */
  // Use the wordCount from the script JSON
  const totalWords = scriptSlides.reduce((sum, s) => sum + (s.wordCount || 0), 0);

  let accumulatedDuration = 0;
  const slideDurations = scriptSlides.map((s, i) => {
    // Last slide takes remaining time to avoid cut-off
    if (i === scriptSlides.length - 1) {
      return Math.max(3, audioDuration - accumulatedDuration);
    }

    // Proportional timing
    const ratio = (s.wordCount || 0) / (totalWords || 1);
    const duration = Math.max(3, audioDuration * ratio); // Min 3 seconds per slide
    accumulatedDuration += duration;
    return duration;
  });

  /* -------- STEP 5: VIDEO -------- */
  const slideDirPath = path.join(process.cwd(), "generated", slideFolder);

  const silentVideoPath = await generateVideoFromSlides(
    slideDirPath,
    silentVideo,
    slideDurations
  );

  if (!(await ensureFileExists(silentVideoPath))) {
    throw new Error("Silent video generation failed");
  }

  const finalOutputPath = path.join(process.cwd(), "generated", finalVideo);
  await mergeVideoAndAudio(silentVideoPath, audioPath, finalOutputPath);

  return {
    finalVideo: `/generated/${finalVideo}`,
    part,
    duration,
  };
};

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

    const result = await processVideoGeneration({
      topic,
      duration,
      mode: "CRASH",
      part: 1,
      language,
    });

    res.json({ success: true, mode: "CRASH", ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generateFullCoursePart = async (req, res) => {
  try {
    const { topic, duration, part = 1, language = "en" } = req.body;

    // Re-check analysis to confirm total parts (optional, but good for returning metadata)
    // We assume the frontend/user handles the flow, but we return 'hasNextPart' metadata
    const analysis = await analyzeTopicSize(topic, duration);
    const totalParts = analysis.estimatedParts || 1;

    const result = await processVideoGeneration({
      topic,
      duration,
      mode: "FULL",
      part: Number(part),
      language,
    });

    res.json({
      success: true,
      mode: "FULL",
      ...result,
      currentPart: Number(part),
      totalParts: totalParts,
      hasNextPart: Number(part) < totalParts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
