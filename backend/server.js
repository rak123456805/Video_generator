import express from "express";
import cors from "cors";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import videoRoutes from "./src/routes/videoRoutes.js";

import dotenv from "dotenv";
dotenv.config();


const app = express();

// ✅ Standard Middleware
app.use(cors());
app.use(express.json());

// ✅ Handle paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Auto-create 'generated' folder if it doesn't exist
const generatedPath = path.join(process.cwd(), "generated");
if (!fs.existsSync(generatedPath)) {
    fs.mkdirSync(generatedPath, { recursive: true });
    console.log("📁 Created 'generated' folder for assets");
}

/**
 * ✅ Serve generated videos & audio statically
 * Access via: http://localhost:5000/generated/your-video.mp4
 */
app.use("/generated", express.static(generatedPath));

// ✅ API Routes
app.use("/api/video", videoRoutes);

app.get("/", (req, res) => {
    res.send("Edu Video Backend running ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server Running on port ${PORT}`);
    console.log(`📂 Static files served from: ${generatedPath}`);
});