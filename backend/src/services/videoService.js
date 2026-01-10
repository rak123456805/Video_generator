/* src/services/videoService.js */

import path from "path";
import fs from "fs";

import { generateSlides } from "./slideService.js";
import { generateVideoFromSlides } from "./slideVideoService.js";
import { mergeVideoAndAudio } from "./videoMergeService.js";
import { getAudioDuration } from "./audioService.js";

export const generateCourseVideo = async ({
  script,
  slideFolder,
  audioPath,
  language = "en",
}) => {
  console.log("🚀 Starting video generation pipeline");

  /* 1️⃣ Slides */
  const slides = await generateSlides(script, slideFolder, language);

  if (!slides || slides.length === 0) {
    throw new Error("No slides generated");
  }

  const slideDir = path.join(process.cwd(), "generated", slideFolder);
  const slideCount = slides.length;

  console.log("🎞 Slides:", slideCount);

  /* 2️⃣ Audio duration */
  const audioDuration = await getAudioDuration(audioPath);

  console.log("🎧 Audio duration (seconds):", audioDuration);

  if (!Number.isFinite(audioDuration)) {
    throw new Error("Audio duration is NaN — stopping pipeline");
  }

  /* 3️⃣ Language-aware multiplier */
  const LANGUAGE_TIME_MULTIPLIER = {
    hi: 1.15,
    mr: 1.15,
    kn: 1.2,
    ta: 1.15,
    te: 1.15,
    ml: 1.25,
    bn: 1.15,
    en: 1.0,
  };

  const multiplier = LANGUAGE_TIME_MULTIPLIER[language] || 1.0;

  /* 4️⃣ Slide duration */
  const slideDuration =
    (audioDuration / slideCount) * multiplier;

  if (!Number.isFinite(slideDuration) || slideDuration <= 0) {
    throw new Error(
      `Computed slideDuration invalid: ${slideDuration}`
    );
  }

  console.log("⏱ Slide duration:", slideDuration.toFixed(2), "seconds");
  console.log(
    "🎥 Expected video length:",
    (audioDuration / 60).toFixed(2),
    "minutes"
  );

  /* 5️⃣ Silent video */
  const silentVideoPath = await generateVideoFromSlides(
    slideDir,
    `silent-${Date.now()}.mp4`,
    slideDuration
  );

  /* 6️⃣ Merge */
  const finalVideoPath = await mergeVideoAndAudio(
    silentVideoPath,
    audioPath,
    path.join(process.cwd(), "generated", `final-${Date.now()}.mp4`)
  );

  console.log("🎉 FINAL VIDEO:", finalVideoPath);

  return finalVideoPath;
};
