/* src/services/slideVideoService.js */
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg"; 

export const generateVideoFromSlides = async (slideDirPath, outputFileName, slideDuration) => {
  const absSlideDir = path.resolve(slideDirPath);
  const outputFile = path.join(process.cwd(), "generated", outputFileName);

  const slides = fs.readdirSync(absSlideDir)
    .filter(f => f.endsWith(".png"))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  if (slides.length === 0) throw new Error("No slide images found in directory");

  const concatFilePath = path.join(absSlideDir, "slides.txt");
  let concatData = "";
  
  slides.forEach((file) => {
    const filePath = path.join(absSlideDir, file).replace(/\\/g, "/");
    concatData += `file '${filePath}'\nduration ${slideDuration}\n`;
  });
  
  // FFmpeg requires the last file to be repeated without a duration to end correctly
  const lastPath = path.join(absSlideDir, slides[slides.length-1]).replace(/\\/g, "/");
  concatData += `file '${lastPath}'`;

  fs.writeFileSync(concatFilePath, concatData);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFilePath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c:v libx264", "-pix_fmt yuv420p", "-r 30"])
      .save(outputFile)
      .on("start", (cmd) => console.log("🎥 FFmpeg started for silent video"))
      .on("end", () => resolve(outputFile))
      .on("error", (err) => reject(err));
  });
};