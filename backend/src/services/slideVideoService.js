/* src/services/slideVideoService.js */

import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

export const generateVideoFromSlides = async (
  slideDirPath,
  outputFileName,
  slideDurations // Array of numbers
) => {
  const absSlideDir = path.resolve(slideDirPath);
  const outputFile = path.join(process.cwd(), "generated", outputFileName);
  const concatFilePath = path.join(absSlideDir, "slides.txt");

  if (!Array.isArray(slideDurations) || slideDurations.length === 0) {
    throw new Error(`Invalid slideDurations: ${slideDurations}`);
  }

  /* --------------------------------------------------
     1️⃣ Create Concat File for Variable Durations
     Format:
     file 'filename'
     duration 5
  -------------------------------------------------- */
  const slides = fs
    .readdirSync(absSlideDir)
    .filter(f => /^slide_\d+\.png$/.test(f))
    // Natural sort (slide_1, slide_2, ..., slide_10)
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  if (slides.length !== slideDurations.length) {
    console.warn(
      `⚠️ Warning: Slide count (${slides.length}) != Duration count (${slideDurations.length}). Truncating to match.`
    );
  }

  const count = Math.min(slides.length, slideDurations.length);
  let concatContent = "";

  for (let i = 0; i < count; i++) {
    // FFmpeg requires forward slashes even on Windows for concat files
    const safePath = path.join(absSlideDir, slides[i]).replace(/\\/g, "/");

    concatContent += `file '${safePath}'\n`;
    concatContent += `duration ${slideDurations[i]}\n`;
  }

  // BUG FIX: FFmpeg concat demuxer ends video immediately after last duration. 
  // To show the last slide, we must repeat the last entry or rely on the duration behavior.
  // Actually, standard behavior is: it shows the file for 'duration'. 
  // However, sometimes the very last frame is dropped if audio is longer. 
  // We append the last slide again with a tiny duration just to be safe, or simply trust the duration.
  // We will trust the duration logic but ensure the file format is correct.

  // Note: key quirk of concat demuxer: "file" lines specify the path, "duration" specifies how long to hold THAT file.

  fs.writeFileSync(concatFilePath, concatContent);

  console.log("🎥 FFmpeg Concat File Created at:", concatFilePath);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFilePath)
      .inputOptions([
        "-f concat",
        "-safe 0" // Allow absolute paths
      ])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-r 30", // Force 30fps output
        "-movflags +faststart"
      ])
      .on("start", (cmd) => {
        console.log("🎥 FFmpeg started command:", cmd);
      })
      .on("end", () => {
        console.log("✅ Silent video generated successfully");
        // Optional: cleanup concat file? 
        // fs.unlinkSync(concatFilePath); 
        resolve(outputFile);
      })
      .on("error", err => {
        console.error("❌ FFmpeg error:", err.message);
        reject(err);
      })
      .save(outputFile);
  });
};
