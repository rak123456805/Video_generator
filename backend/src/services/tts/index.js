/* src/services/tts/index.js - Robust Edge TTS using Python tool with chunking */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { TTS_LANGUAGES } from "./voices.js";

const execAsync = promisify(exec);

/**
 * Split text into chunks based on sentences to stay within service limits
 * and prevent timeouts.
 */
const splitText = (text, maxLength = 3000) => {
    const chunks = [];
    let current = "";
    // Split by common sentence endings and include the delimiter
    const sentences = text.split(/(?<=[.!?।])\s+/);

    for (const sentence of sentences) {
        if ((current + sentence).length > maxLength) {
            if (current.trim()) chunks.push(current.trim());
            current = sentence;
        } else {
            current += (current ? " " : "") + sentence;
        }
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
};

export const generateSpeech = async (text, outputFile, language = "en") => {
    const outputDir = path.join(process.cwd(), "generated");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, outputFile);
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }

    const langConfig = TTS_LANGUAGES.find(v => v.code === language) ||
        TTS_LANGUAGES.find(v => v.code === "en");
    const voice = langConfig.voice;

    console.log("🎙 Generating speech using Edge-TTS (Python CLI + Chunking)...");
    console.log(`🌐 Language: ${language} (${voice})`);

    const chunks = splitText(text);
    console.log(`🔊 Total Chunks to process: ${chunks.length} (Text length: ${text.length} chars)`);

    const pythonCommand = process.platform === "win32" ? "python" : "python3";
    const chunkFiles = [];

    try {
        for (let i = 0; i < chunks.length; i++) {
            console.log(`   ▶️ Generating chunk ${i + 1}/${chunks.length}`);
            const chunkPath = path.join(outputDir, `chunk_${Date.now()}_${i}.mp3`);
            chunkFiles.push(chunkPath);

            // Use escaped text for CLI or temp file? 
            // Better to use a temp text file for each chunk to avoid CLI length limits/escaping issues
            const tempTextFile = path.join(outputDir, `temp_chunk_${Date.now()}_${i}.txt`);
            fs.writeFileSync(tempTextFile, chunks[i], "utf-8");

            try {
                const command = `${pythonCommand} -m edge_tts --voice "${voice}" --file "${tempTextFile}" --write-media "${chunkPath}"`;
                await execAsync(command, { timeout: 300000 }); // 5 mins per chunk max
            } finally {
                if (fs.existsSync(tempTextFile)) fs.unlinkSync(tempTextFile);
            }

            if (!fs.existsSync(chunkPath) || fs.statSync(chunkPath).size < 100) {
                throw new Error(`Failed to generate audio for chunk ${i + 1}`);
            }
        }

        console.log("🔗 Merging chunks using FFmpeg...");

        // Create a concat list for FFmpeg
        const listFilePath = path.join(outputDir, `concat_list_${Date.now()}.txt`);
        const listContent = chunkFiles.map(f => `file '${f.replace(/\\/g, "/")}'`).join("\n");
        fs.writeFileSync(listFilePath, listContent, "utf-8");

        try {
            const mergeCommand = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
            await execAsync(mergeCommand);
        } finally {
            if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
        }

        // Clean up chunks
        for (const file of chunkFiles) {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("Final audio file was not created");
        }

        const size = fs.statSync(outputPath).size;
        console.log("✅ Audio generated and merged successfully!");
        console.log(`🎧 Final size: ${(size / 1024).toFixed(2)} KB`);

        return outputPath;

    } catch (error) {
        // Cleanup on error
        for (const file of chunkFiles) {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        }
        console.error("❌ Edge-TTS Error:", error.message);
        throw error;
    }
};
