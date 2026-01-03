import gTTS from "gtts";
import fs from "fs";
import path from "path";

export const generateSpeech = async (text, filename) => {
  const outputDir = path.join(process.cwd(), "generated");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, filename);

  // 1️⃣ CLEANING LOGIC: Remove symbols that shouldn't be spoken
  // This prevents the AI from saying "Hash", "Dash", or "Asterisk"
  const cleanText = text
    .replace(/[#*_-]/g, " ")       // Replace structural symbols with a space
    .replace(/[:]/g, ". ")         // Replace colons with periods for better pausing
    .replace(/\s+/g, " ")          // Remove double/triple spaces
    .trim();

  // 2️⃣ FORMATTING: Ensure the text isn't just one giant block
  // gTTS handles natural pauses better with punctuation
  const finalSpeechText = cleanText;

  console.log(`🎙️  Generating Audio for: ${filename}`);

  return new Promise((resolve, reject) => {
    // We use the cleaned text instead of the raw markdown script
    const gtts = new gTTS(finalSpeechText, "en");

    gtts.save(filePath, (err) => {
      if (err) {
        console.error("❌ gTTS Error:", err);
        reject(err);
      } else {
        // Double check file size to ensure it's not a 0-byte failure
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          console.log(`✅ Audio File Saved: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);
          resolve(filePath);
        } else {
          reject(new Error("Audio file was created but is empty."));
        }
      }
    });
  });
};