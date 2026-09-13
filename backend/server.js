import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import videoRoutes from "./src/routes/videoRoutes.js";
import quizRoutes from "./src/routes/quizRoutes.js";
import googleDriveRoutes from "./src/routes/googleDriveRoutes.js";
import { markInterruptedJobs } from "./src/services/jobStore.js";

dotenv.config();

const app = express();

/* ---------------- MIDDLEWARE ---------------- */

// Allow configurable CORS origins for production deployment
const rawOrigins = process.env.CORS_ORIGINS || "http://localhost:5173";
const allowedOrigins = rawOrigins.split(",").map(s => {
  let origin = s.trim();
  if (origin.endsWith("/")) origin = origin.slice(0, -1);
  return origin;
});

console.log("🛠️ Allowed CORS Origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        console.warn(`🛑 CORS Blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Range", "Accept", "Origin"],
    exposedHeaders: ["Content-Length", "Content-Range", "Content-Type", "Accept-Ranges"],
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers (IE11) choke on 204
  })
);

// Respond to all OPTIONS preflights explicitly (needed for cross-origin <video> with ?token= auth)
app.options("*", cors());

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

const generatedPath = path.join(__dirname, "generated");

if (!fs.existsSync(generatedPath)) {
  fs.mkdirSync(generatedPath, { recursive: true });
  console.log("📁 Created 'generated' folder for assets");
}

/* ---------------- STATIC FILES ---------------- */

app.use("/generated", express.static(generatedPath));

/* ---------------- API ROUTES ---------------- */

app.use("/api/video", videoRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/google-drive", googleDriveRoutes);

/* ---------------- HEALTH CHECK ---------------- */

app.get("/", (req, res) => {
  res.send("Edu Video Backend running ✅");
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Running on port ${PORT}`);
  console.log(`📂 Static files served from: ${generatedPath}`);

  // Mark any interrupted jobs from previous server runs as failed
  markInterruptedJobs();

  /* FIX 6: Warn loudly if running on Render without a persistent Disk.
   *
   * On Render, the filesystem is EPHEMERAL by default — every deploy or
   * spin-down wipes /app/generated, losing all job state and generated videos.
   *
   * To fix:
   *   1. Attach a Render Disk to the service, mounted at /app/generated.
   *   2. Add RENDER_DISK_MOUNTED=true to the service's Environment Variables.
   *
   * See DEPLOYMENT.md for full instructions.
   */
  if (process.env.RENDER && !process.env.RENDER_DISK_MOUNTED) {
    console.warn('╔═══════════════════════════════════════════════════════════════╗');
    console.warn('║  ⚠️  PERSISTENT STORAGE WARNING                               ║');
    console.warn('║  RENDER_DISK_MOUNTED is not set.                              ║');
    console.warn('║  Generated videos and job state WILL be lost on every         ║');
    console.warn('║  deploy / restart / spin-down.                                ║');
    console.warn('║  Attach a Render Disk at /app/generated and set               ║');
    console.warn('║  RENDER_DISK_MOUNTED=true in the service env vars.            ║');
    console.warn('║  See DEPLOYMENT.md for instructions.                          ║');
    console.warn('╚═══════════════════════════════════════════════════════════════╝');
  }
});

// Nodemon restart trigger

