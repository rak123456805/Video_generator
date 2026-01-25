/* src/services/tts/index.js - Edge TTS using Python module */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

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

export const generateSpeech = async (text, outputFile, language = "en") => {
    const outputDir = path.join(process.cwd(), "generated");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, outputFile);
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }

    const voice = VOICES[language] || VOICES.en;
    console.log("🎙 Generating speech using Edge-TTS...");
    console.log(`🌐 Language: ${language} (${voice})`);

    const tempTextFile = path.join(outputDir, `temp_${Date.now()}.txt`);
    fs.writeFileSync(tempTextFile, text, "utf-8");

    try {
        // Platform check: Linux/Mac usually use 'python3', Windows uses 'python'
        const pythonCommand = process.platform === "win32" ? "python" : "python3";

        // Use python -m edge_tts
        const command = `${pythonCommand} -m edge_tts --voice "${voice}" --file "${tempTextFile}" --write-media "${outputPath}"`;

        console.log(`🔊 Running Edge-TTS via ${pythonCommand}... (Text length: ${text.length} chars)`);
        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 1200000 // 20 minutes timeout for long audio
        });

        if (stderr && !stderr.includes("INFO") && !stderr.includes("edge_tts")) {
            console.warn("⚠️ Edge-TTS warnings:", stderr);
        }

        // Clean up temp file
        if (fs.existsSync(tempTextFile)) {
            fs.unlinkSync(tempTextFile);
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("Audio file was not created");
        }

        const size = fs.statSync(outputPath).size;
        if (size < 1000) {
            throw new Error("Generated audio file is too small");
        }

        console.log("✅ Audio generated successfully!");
        console.log(`🎧 File size: ${(size / 1024).toFixed(2)} KB`);

        return outputPath;

    } catch (error) {
        if (fs.existsSync(tempTextFile)) {
            fs.unlinkSync(tempTextFile);
        }

        console.error("❌ Edge-TTS Error Details:", {
            message: error.message,
            stderr: error.stderr,
            stdout: error.stdout,
            signal: error.signal,
            code: error.code
        });

        // Check for timeout
        if (error.signal === 'SIGTERM') {
            throw new Error("Edge-TTS timed out. The text might be too long for a single request. Please try a shorter duration.");
        }

        // Check for specific "command not found" indicators
        const isCommandNotFound =
            (error.message && error.message.includes("not recognized")) || // Windows
            (error.message && error.message.includes("command not found")) || // Unix
            (error.code === 'ENOENT'); // Node internal

        if (isCommandNotFound) {
            throw new Error("Python is not installed or not in PATH. Please install Python 3.7+ and edge-tts: pip install edge-tts");
        }

        if (error.message && error.message.includes("No module named")) {
            throw new Error("edge-tts module not found. Please run: pip install edge-tts");
        }

        // Pass through the actual stderr if available, as it usually contains the specific python/lib error
        const detailedError = error.stderr || error.message;
        throw new Error(`Edge-TTS failed: ${detailedError}`);
    }
};
