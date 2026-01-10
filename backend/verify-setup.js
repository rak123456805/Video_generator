
import { analyzeTopicSize } from "./src/services/analysisService.js";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const runVerification = async () => {
    console.log("🔍 Starting Backend Verification...");

    // 1. Check Environment
    if (!process.env.GOOGLE_API_KEY) {
        console.warn("⚠️  WARNING: GOOGLE_API_KEY is missing in .env file.");
        console.warn("    Analysis and Video Generation will fail without it.");
    } else {
        console.log("✅ GOOGLE_API_KEY found.");
    }

    // 2. Check Directories
    const dirs = ["generated"];
    dirs.forEach(d => {
        if (!fs.existsSync(d)) {
            console.log(`📁 Creating missing directory: ${d}`);
            fs.mkdirSync(d);
        } else {
            console.log(`✅ Directory exists: ${d}`);
        }
    });

    // 3. Test Analysis Service (only if key exists)
    if (process.env.GOOGLE_API_KEY) {
        console.log("🧠 Testing Gemini Analysis Service...");
        try {
            const result = await analyzeTopicSize("Basics of Python", "15min");
            console.log("✅ Analysis Result:", JSON.stringify(result, null, 2));

            if (result.feasible !== undefined) {
                console.log("✅ Service matches expected schema.");
            } else {
                console.error("❌ Service returned unexpected schema.");
            }
        } catch (error) {
            console.error("❌ Analysis Service Failed:", error.message);
        }
    } else {
        console.log("⏭️  Skipping Service Test (No API Key).");
    }

    console.log("🎉 Verification Complete.");
};

runVerification();
