import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import videoRoutes from "./src/routes/videoRoutes.js";
import quizRoutes from "./src/routes/quizRoutes.js";

dotenv.config();

const app = express();

/* ---------------- MIDDLEWARE ---------------- */

app.use(
  cors({
    origin: "http://localhost:5173", // frontend
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  console.log("➡️ Incoming:", req.method, req.url);
  next();
});

/* ---------------- PATH SETUP ---------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- GENERATED FOLDER ---------------- */

const generatedPath = path.join(process.cwd(), "generated");
if (!fs.existsSync(generatedPath)) {
  fs.mkdirSync(generatedPath, { recursive: true });
  console.log("📁 Created 'generated' folder for assets");
}

/* ---------------- STATIC FILES ---------------- */

app.use("/generated", express.static(generatedPath));

/* ---------------- API ROUTES ---------------- */

app.use("/api/video", videoRoutes);
app.use("/api/quiz", quizRoutes);

/* ---------------- HEALTH CHECK ---------------- */

app.get("/", (req, res) => {
  res.send("Edu Video Backend running ✅");
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Running on port ${PORT}`);
  console.log(`📂 Static files served from: ${generatedPath}`);
});

// Nodemon restart trigger

