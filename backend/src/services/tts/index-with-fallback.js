/* src/services/tts/index-with-fallback.js */

import fs from "fs";
import path from "path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import gTTS from "gtts";

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
 * gTTS language codes
 */
const GTTS_LANGS = {
    en: "en",
    hi: "hi",
    kn: "kn",
    ta: "ta",
    te: "te",
    ml: "ml",
    bn: "bn",
    mr: "mr",
};

/**
 * 🔐 Safe sentence-based chunking
 */
const splitText = (text, maxLength = 4000) => {
    const chunks = [];
    let current = "";
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
 * 🎙 Generate speech using Edge TTS with gTTS fallback
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

    // Try Edge TTS first
    try {
        console.log("🎙 Attempting Edge-TTS...");
        return await generateWithEdgeTTS(text, outputPath, language);
    } catch (edgeError) {
        console.warn("⚠️ Edge-TTS failed:", edgeError.message);
        console.log("🔄 Falling back to Google TTS...");

        // Fallback to Google TTS
        try {
            return await generateWithGoogleTTS(text, outputPath, language);
        } catch (gttsError) {
            console.error("❌ Both TTS services failed!");
            console.error("Edge TTS error:", edgeError.message);
            console.error("Google TTS error:", gttsError.message);
            throw new Error(`TTS generation failed. Edge TTS: ${edgeError.message}, Google TTS: ${gttsError.message}`);
        }
    }
};

/**
 * Generate using Microsoft Edge TTS
 */
async function generateWithEdgeTTS(text, outputPath, language) {
    const tts = new MsEdgeTTS();

    await tts.setMetadata(
        VOICES[language] || VOICES.en,
        OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const writeStream = fs.createWriteStream(outputPath);
    const chunks = splitText(text);

    console.log(`🔊 Edge-TTS: Processing ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
        console.log(`▶️ Edge-TTS chunk ${i + 1}/${chunks.length}`);

        const result = await tts.toStream(chunks[i]);
        const audioStream = result.audioStream;

        await new Promise((resolve, reject) => {
            audioStream.on("data", (chunk) => {
                writeStream.write(chunk);
            });

            audioStream.on("end", resolve);
            audioStream.on("error", reject);
        });
    }

    writeStream.end();
    await new Promise((resolve) => writeStream.on("finish", resolve));

    const size = fs.statSync(outputPath).size;
    if (size < 1000) {
        throw new Error("Edge-TTS produced empty audio file");
    }

    console.log("✅ Edge-TTS: Audio generated successfully");
    console.log("🎧 Audio size:", size, "bytes");

    return outputPath;
}

/**
 * Generate using Google TTS (Fallback)
 */
async function generateWithGoogleTTS(text, outputPath, language) {
    return new Promise((resolve, reject) => {
        const lang = GTTS_LANGS[language] || "en";

        console.log(`🔊 Google-TTS: Generating audio in ${lang}`);

        const gtts = new gTTS(text, lang);

        gtts.save(outputPath, (err) => {
            if (err) {
                console.error("❌ Google-TTS Error:", err);
                reject(err);
            } else {
                const stats = fs.statSync(outputPath);
                if (stats.size > 0) {
                    console.log(`✅ Google-TTS: Audio generated (${(stats.size / 1024).toFixed(2)} KB)`);
                    resolve(outputPath);
                } else {
                    reject(new Error("Google-TTS produced empty audio file"));
                }
            }
        });
    });
}
