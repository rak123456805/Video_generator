/* src/services/tts/index.js
   Uses google-tts-api (Google Translate TTS) — no Python, no Microsoft dependency.
   Falls back with 3 retries + exponential backoff for network errors.
*/

import fs from "fs";
import path from "path";
import https from "https";
import { getAllAudioBase64 } from "google-tts-api";
import { exec } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";

const execAsync = promisify(exec);

/* ── Language mapping for Google TTS ────────────────────── */
const GOOGLE_TTS_LANG = {
    en: "en",
    hi: "hi",
    ta: "ta",
    te: "te",
    kn: "kn",
    ml: "ml",
    bn: "bn",
    mr: "mr",
    gu: "gu",
    pa: "pa",
    ur: "ur",
};

/* ── helpers ─────────────────────────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Split text into chunks ≤200 chars (Google TTS URL limit).
 * Prefer sentence boundaries.
 */
const splitText = (text, maxLength = 180) => {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?।,;])\s+/);
    let current = "";

    for (const sentence of sentences) {
        if (sentence.length > maxLength) {
            // Force-split very long sentences by words
            if (current.trim()) { chunks.push(current.trim()); current = ""; }
            const words = sentence.split(" ");
            let part = "";
            for (const word of words) {
                if ((part + " " + word).trim().length > maxLength) {
                    if (part.trim()) chunks.push(part.trim());
                    part = word;
                } else {
                    part = (part + " " + word).trim();
                }
            }
            if (part.trim()) current = part;
        } else if ((current + " " + sentence).trim().length > maxLength) {
            if (current.trim()) chunks.push(current.trim());
            current = sentence;
        } else {
            current = (current + " " + sentence).trim();
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
};

/**
 * Download a URL to a file path, with retry.
 */
const downloadUrl = (url, destPath) =>
    new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (res) => {
            res.pipe(file);
            file.on("finish", () => file.close(resolve));
        }).on("error", (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });

/**
 * Generate audio for a text chunk using google-tts-api, with retry.
 */
const generateChunkWithRetry = async (text, lang, chunkPath, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // getAllAudioBase64 handles texts > 200 chars automatically
            const audioBase64List = await getAllAudioBase64(text, {
                lang,
                slow: false,
                host: "https://translate.google.com",
                timeout: 10000,
            });

            // Concatenate all base64 segments into one buffer
            const buffers = audioBase64List.map((item) =>
                Buffer.from(item.base64, "base64")
            );
            fs.writeFileSync(chunkPath, Buffer.concat(buffers));

            if (!fs.existsSync(chunkPath) || fs.statSync(chunkPath).size < 100) {
                throw new Error("Generated file is empty or too small.");
            }
            return;
        } catch (err) {
            console.warn(`   ⚠️ Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
            if (attempt < maxRetries) {
                const delay = attempt * 3000;
                console.log(`   ⏳ Retrying in ${delay / 1000}s…`);
                await sleep(delay);
            } else {
                throw err;
            }
        }
    }
};

/* ── main export ─────────────────────────────────────────── */

export const generateSpeech = async (text, outputFile, language = "en") => {
    const outputDir = path.join(process.cwd(), "generated");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, path.basename(outputFile));
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    const lang = GOOGLE_TTS_LANG[language] || "en";
    console.log("🎙 Generating speech using Google TTS…");
    console.log(`🌐 Language: ${language} → Google TTS lang: ${lang}`);

    const cleanText = text.replace(/\s+/g, " ").trim();

    // google-tts-api has a hard 200-char limit per request;
    // getAllAudioBase64 handles splitting internally, but we still chunk
    // at ~800 chars to keep individual requests fast and retryable.
    const CHUNK_SIZE = 800;
    const chunks = splitText(cleanText, CHUNK_SIZE);
    console.log(`🔊 Total chunks: ${chunks.length}  (text length: ${cleanText.length} chars)`);

    const chunkFiles = [];

    try {
        for (let i = 0; i < chunks.length; i++) {
            console.log(`   ▶️ Generating chunk ${i + 1}/${chunks.length}`);
            const chunkPath = path.join(outputDir, `chunk_${Date.now()}_${i}.mp3`);
            chunkFiles.push(chunkPath);
            await generateChunkWithRetry(chunks[i], lang, chunkPath);
        }

        /* ── merge or rename ────────────────────────────────── */
        if (chunkFiles.length === 1) {
            fs.renameSync(chunkFiles[0], outputPath);
        } else {
            console.log("🔗 Merging chunks with FFmpeg…");
            const listFilePath = path.join(outputDir, `concat_list_${Date.now()}.txt`);
            const listContent = chunkFiles
                .map((f) => `file '${f.replace(/\\/g, "/")}'`)
                .join("\n");
            fs.writeFileSync(listFilePath, listContent, "utf-8");

            try {
                const mergeCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
                await execAsync(mergeCmd);
            } finally {
                if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
            }

            for (const f of chunkFiles) {
                if (fs.existsSync(f)) fs.unlinkSync(f);
            }
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("Final audio file was not created.");
        }

        const size = fs.statSync(outputPath).size;
        console.log("✅ Audio generated successfully!");
        console.log(`🎧 Final size: ${(size / 1024).toFixed(2)} KB`);

        return outputPath;

    } catch (error) {
        for (const f of chunkFiles) {
            if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        console.error("❌ TTS Error:", error.message);
        throw error;
    }
};
