import { exec } from "child_process";
import path from "path";
import fs from "fs";

export const generateVideoFromAudio = async (slidesFolder, audioPath, outputName) => {
  const absSlides = path.resolve(process.cwd(), "generated", slidesFolder);
  const absAudio = path.resolve(audioPath);
  const outPath = path.join(process.cwd(), "generated", outputName);

  // Sync slides to audio: approx 5s per slide
  const cmd = `ffmpeg -y -framerate 1/5 -start_number 1 -i "${absSlides}/slide-%d.png" -i "${absAudio}" -c:v libx264 -r 30 -pix_fmt yuv420p -c:a aac -shortest "${outPath}"`;

  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(outPath);
    });
  });
};