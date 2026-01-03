/* src/controllers/videoController.js */

import path from "path";
import fs from "fs";
import { analyzeTopicSize } from "../services/analysisService.js";
import { generateAIScript } from "../services/scriptService.js";
import { generateSpeech } from "../services/tts/index.js";
import { scriptToSlides } from "../services/scriptToSlides.js";
import { generateSlides } from "../services/slideService.js";
import { generateVideoFromSlides } from "../services/slideVideoService.js";
import { getAudioDuration } from "../services/audioService.js";
import { mergeVideoAndAudio } from "../services/videoMergeService.js";

/* Utility: wait for file to exist */
const ensureFileExists = async (filePath, timeout = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) return true;
    await new Promise((res) => setTimeout(res, 1000));
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

  console.log(
    `🚀 Generating | Mode: ${mode} | Topic: ${topic} | Duration: ${duration} | Part: ${part}`
  );

  // 1️⃣ Script
  const script = await generateAIScript({
    topic,
    duration,
    mode,
    part,
    language,
  });

  // 2️⃣ Slides
  const slides = scriptToSlides(script);
  if (!slides.length) throw new Error("Slide parsing failed");

  const slidePaths = await generateSlides(slides, slideFolder, topic);
  if (!slidePaths.length) throw new Error("Slide generation failed");

  // 3️⃣ Audio
 const audioPath = await generateSpeech(script, audioFile, language);

// 🔐 HARD WAIT: ensure MP3 is finalized
if (!(await ensureFileExists(audioPath, 60000))) {
  throw new Error("Audio file not finalized properly");
}
console.log("🎧 Audio file size:", fs.statSync(audioPath).size, "bytes");

  // 4️⃣ Timing (CRITICAL FIX)
  console.log("⏱ Reading audio duration...");
const audioDuration = await getAudioDuration(audioPath);
console.log("⏱ Audio duration:", audioDuration, "seconds");


  /**
   * 🔐 SAFETY:
   * - Minimum 3 seconds per slide
   * - Prevents ultra-short silent videos
   */
  const slideTime = Math.max(
    3,
    audioDuration / slidePaths.length
  );

  console.log(
    `🎬 Audio: ${audioDuration.toFixed(
      2
    )}s | Slides: ${slidePaths.length} | SlideTime: ${slideTime.toFixed(2)}s`
  );

  // 5️⃣ Silent video
  const slideDirPath = path.join(process.cwd(), "generated", slideFolder);
  const silentVideoPath = await generateVideoFromSlides(
    slideDirPath,
    silentVideo,
    slideTime
  );

  if (!(await ensureFileExists(silentVideoPath)))
    throw new Error("Silent video generation failed");

  // 6️⃣ Merge (audio controls duration)
  const finalOutputPath = path.join(process.cwd(), "generated", finalVideo);
  await mergeVideoAndAudio(silentVideoPath, audioPath, finalOutputPath);

  return {
    finalVideo: `/generated/${finalVideo}`,
    part,
    actualDuration: `${Math.round(audioDuration)}s`,
  };
};

/* ---------------- API HANDLERS ---------------- */

export const analyzeTopic = async (req, res) => {
  const { topic, duration } = req.body;
  if (!topic || !duration) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  const analysis = analyzeTopicSize(topic, duration);
  res.json({ success: true, analysis });
};

export const generateSingleVideo = async (req, res) => {
  try {
    const { topic, duration, language = "en" } = req.body;

    const analysis = analyzeTopicSize(topic, duration);
    if (!analysis.feasible) {
      return res.status(400).json({
        success: false,
        message: "Topic not feasible as single video",
      });
    }

    const result = await processVideoGeneration({
      topic,
      duration,
      mode: "SINGLE",
      part: 1,
      language,
    });

    res.json({ success: true, mode: "SINGLE", ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generateFullCoursePart = async (req, res) => {
  try {
    const { topic, duration, part = 1, language = "en" } = req.body;

    const analysis = analyzeTopicSize(topic, duration);

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
      totalParts: analysis.estimatedParts,
      hasNextPart: Number(part) < analysis.estimatedParts,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
