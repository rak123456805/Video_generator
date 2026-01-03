/* src/services/audioService.js */

import { exec } from "child_process";
import ffprobePath from "ffprobe-static";
import path from "path";

export const getAudioDuration = (audioPath) => {
  return new Promise((resolve, reject) => {
    const cmd = `"${ffprobePath.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;

    const process = exec(cmd, { timeout: 15000 }, (err, stdout) => {
      if (err) {
        reject(new Error("ffprobe failed to read audio duration"));
        return;
      }

      const duration = parseFloat(stdout);
      if (isNaN(duration) || duration <= 0) {
        reject(new Error("Invalid audio duration"));
        return;
      }

      resolve(duration);
    });

    // 🔐 HARD SAFETY: kill stuck process
    setTimeout(() => {
      process.kill();
    }, 16000);
  });
};
