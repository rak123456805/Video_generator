/* src/services/tts/engine.js */

import fs from "fs";
import path from "path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { TTS_LANGUAGES } from "./voices.js";

const MAX_CHARS = 2500; 

export const generateSpeech = async (text, outputFile, langCode = "en") => {
  const outputDir = path.resolve(process.cwd(), "generated");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, path.basename(outputFile));
  if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { force: true });

  const tts = new MsEdgeTTS();
  const langConfig = TTS_LANGUAGES.find(v => v.code === langCode) || TTS_LANGUAGES[0];

  await tts.setMetadata(
    langConfig.voice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  // 🛠️ BUG FIX 1: Allow Multilingual Text
  // Removed /[^\x00-\x7F]/g because it was deleting Kannada/Hindi/Special characters
  const cleanText = text
    .replace(/\s+/g, " ")
    .trim();

  const chunks = [];
  for (let i = 0; i < cleanText.length; i += MAX_CHARS) {
    chunks.push(cleanText.slice(i, i + MAX_CHARS));
  }

  console.log(`🎙️ TTS Engine: Language set to ${langCode} (${langConfig.voice})`);
  console.log(`🔊 Total Chunks to process: ${chunks.length}`);

  const writer = fs.createWriteStream(outputPath);

  try {
    for (let i = 0; i < chunks.length; i++) {
      console.log(`   ▶️ Generating chunk ${i + 1}/${chunks.length}`);

      // We use toStream for memory efficiency in 1-hour videos
      const result = await tts.toStream(chunks[i]);

      if (!result || !result.audioStream) {
        throw new Error(`TTS failed for chunk ${i + 1}`);
      }

      await new Promise((resolve, reject) => {
        // We do NOT end the writer until the very last chunk is done
        result.audioStream.pipe(writer, { end: false });
        result.audioStream.on("end", resolve);
        result.audioStream.on("error", (err) => {
            console.error(`❌ Stream error in chunk ${i+1}:`, err);
            reject(err);
        });
      });
    }

    // 🛠️ BUG FIX 2: Wait for the Writer to fully close
    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log("✅ Full audio generated and saved successfully");
        resolve(outputPath);
      });
      writer.on("error", reject);
      writer.end(); // Now we safely close the master file
    });

  } catch (error) {
    writer.end();
    console.error("❌ TTS Engine Error:", error.message);
    throw error;
  }
};