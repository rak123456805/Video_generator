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

/* ---------------- SLIDE COUNT LOCK ---------------- */

const SLIDES_PER_DURATION = {
  "15min": 18,
  "30min": 36,
  "1hr": 72,
};

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

  const script = await generateAIScript({ topic, duration, mode, part, language });

  let slides = scriptToSlides(script);
  if (!slides.length) throw new Error("No slides parsed");

  const expectedSlides = SLIDES_PER_DURATION[duration];

  if (slides.length > expectedSlides) {
    slides = slides.slice(0, expectedSlides);
  }

  while (slides.length < expectedSlides) {
    slides.push({ ...slides[slides.length - 1] });
  }

  const slidePaths = await generateSlides(slides, slideFolder, topic, language);

  if (!slidePaths.length) throw new Error("Slide rendering failed");

  const audioPath = await generateSpeech(script, audioFile, language);
  if (!(await ensureFileExists(audioPath))) throw new Error("Audio failed");

  const audioDuration = await getAudioDuration(audioPath);
  const slideTime = Math.max(4, audioDuration / slidePaths.length);

  const slideDirPath = path.join(process.cwd(), "generated", slideFolder);
  const silentVideoPath = await generateVideoFromSlides(
    slideDirPath,
    silentVideo,
    slideTime
  );

  if (!(await ensureFileExists(silentVideoPath))) {
    throw new Error("Silent video failed");
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
    const analysis = analyzeTopicSize(topic, duration);
    res.json({ success: true, analysis });
  } catch {
    res.status(500).json({ success: false });
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
