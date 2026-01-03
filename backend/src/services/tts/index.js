/* src/services/tts/index.js */

import fs from "fs";
import path from "path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/**
 * Voice mapping (India-focused, extendable)
 */
const VOICES = {
  en: "en-IN-NeerjaNeural",
  hi: "hi-IN-SwaraNeural",
  kn: "kn-IN-GaganNeural",
  ta: "ta-IN-PallaviNeural",
  te: "te-IN-ShrutiNeural",
  ml: "ml-IN-SobhanaNeural",
  bn: "bn-IN-TanishaaNeural",
  mr: "mr-IN-AarohiNeural",
};

/**
 * 🔐 Safe sentence-based chunking
 * Required for long audio (15–60 min)
 */
const splitText = (text, maxLength = 4000) => {
  const chunks = [];
  let current = "";

  // Supports Indian punctuation as well
  const sentences = text.split(/(?<=[.!?।])\s+/);

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

/**
 * 🎙 Generate speech using Microsoft Edge TTS
 */
export const generateSpeech = async (text, outputFile, language = "en") => {
  const outputDir = path.join(process.cwd(), "generated");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, outputFile);

  // Remove old file if exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  console.log("🎙 Generating speech using Edge-TTS...");

  const tts = new MsEdgeTTS();

  await tts.setMetadata(
    VOICES[language] || VOICES.en,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  const writeStream = fs.createWriteStream(outputPath);

  const chunks = splitText(text);
  console.log(`🔊 Total Chunks: ${chunks.length}`);

  try {
    for (let i = 0; i < chunks.length; i++) {
      console.log(`▶️ Generating chunk ${i + 1}/${chunks.length}`);

      const result = await tts.toStream(chunks[i]);
      const audioStream = result.audioStream;

      // Write chunk fully before continuing
      await new Promise((resolve, reject) => {
        audioStream.on("data", (chunk) => {
          writeStream.write(chunk);
        });

        audioStream.on("end", resolve);
        audioStream.on("error", reject);
      });
    }

    // Finalize file
    writeStream.end();

    await new Promise((resolve) =>
      writeStream.on("finish", resolve)
    );

    const size = fs.statSync(outputPath).size;
    if (size < 1000) {
      throw new Error("Edge-TTS produced empty audio file");
    }

    console.log("✅ Full audio generated successfully");
    console.log("🎧 Audio size:", size, "bytes");

    return outputPath;

  } catch (error) {
    writeStream.close();
    throw error;
  }
};
