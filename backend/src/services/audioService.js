/* src/services/audioService.js */

import { exec } from "child_process";
import ffprobePath from "ffprobe-static";

export const getAudioDuration = (audioPath) => {
  return new Promise((resolve, reject) => {
    if (!audioPath) {
      return reject(new Error("audioPath is empty or undefined"));
    }

    const cmd = `"${ffprobePath.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;

    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        return reject(
          new Error("ffprobe failed: " + (stderr || err.message))
        );
      }

      const raw = stdout?.trim();
      const duration = Number(raw);

      console.log("🎧 ffprobe raw duration:", raw);

      if (!Number.isFinite(duration) || duration <= 0) {
        return reject(
          new Error(`Invalid audio duration from ffprobe: "${raw}"`)
        );
      }

      resolve(duration);
    });
  });
};
