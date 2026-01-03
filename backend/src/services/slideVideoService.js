import path from "path";
import fs from "fs";
import ffmpeg from "../config/ffmpeg.js";

export const generateVideoFromSlides = async (
  slideDirPath,
  outputFileName,
  slideDuration
) => {
  const absSlideDir = path.resolve(slideDirPath);
  const outputFile = path.join(process.cwd(), "generated", outputFileName);

  // Ensure slide directory exists
  if (!fs.existsSync(absSlideDir)) {
    throw new Error("Slide directory not found");
  }

  const inputPattern = path.join(absSlideDir, "slide-%d.png");

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPattern)
      .inputOptions([
        "-framerate", `1/${slideDuration}`
      ])
      .outputOptions([
        "-c:v libx264",
        "-r 30",
        "-pix_fmt yuv420p",
        "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2"
      ])
      .save(outputFile)
      .on("end", () => {
        console.log("🎞 Slides converted to silent video");
        resolve(outputFile);
      })
      .on("error", (err) => {
        console.error("❌ Slide video error:", err);
        reject(err);
      });
  });
};
