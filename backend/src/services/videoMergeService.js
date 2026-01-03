/* src/services/videoMergeService.js */

import { exec } from "child_process";
import path from "path";
import fs from "fs";

export const mergeVideoAndAudio = (
  silentVideoPath,
  audioPath,
  outputPath
) => {
  return new Promise((resolve, reject) => {
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    if (!outputPath.toLowerCase().endsWith(".mp4")) {
      outputPath += ".mp4";
    }

    /**
     * ✅ FFmpeg 2025 SAFE COMMAND
     * - CFR video
     * - Proper audio sync
     * - No deprecated flags
     */
    const ffmpegCmd = [
      `ffmpeg -y`,
      `-i "${silentVideoPath}"`,
      `-i "${audioPath}"`,
      `-map 0:v:0`,
      `-map 1:a:0`,
      `-c:v libx264`,
      `-preset ultrafast`,
      `-pix_fmt yuv420p`,
      `-fps_mode cfr`,
      `-r 30`,
      `-c:a aac`,
      `-b:a 192k`,
      `-ac 2`,
      `-ar 44100`,
      `-af "aresample=async=1:first_pts=0"`,
      `-shortest`,
      `-movflags +faststart`,
      `"${outputPath}"`
    ].join(" ");

    console.log("🎥 Merging Audio and Video...");
    console.log(ffmpegCmd);

    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg Merge Error:", stderr);
        return reject(
          new Error("FFmpeg failed to merge audio and video")
        );
      }

      if (
        fs.existsSync(outputPath) &&
        fs.statSync(outputPath).size > 1000
      ) {
        console.log("✅ Final video created successfully");
        resolve(outputPath);
      } else {
        reject(
          new Error("FFmpeg finished but output file is invalid")
        );
      }
    });
  });
};
