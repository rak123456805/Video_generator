/* src/services/jobStore.js — File-based persistent job store */

import fs from "fs";
import path from "path";

const JOBS_DIR = path.join(process.cwd(), "generated", "jobs");

// Ensure jobs directory exists
if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

/* ---------- Auto-cleanup: delete jobs older than 2 hours ---------- */
setInterval(() => {
  try {
    const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith(".json"));
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(JOBS_DIR, file);
      try {
        const job = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (now - job.createdAt > TWO_HOURS) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up old job: ${file}`);
        }
      } catch { /* ignore corrupt files */ }
    }
  } catch (err) {
    console.error("Job cleanup error:", err.message);
  }
}, 10 * 60 * 1000);

/* ---------- Helpers ---------- */

function jobPath(id) {
  return path.join(JOBS_DIR, `${id}.json`);
}

function readJobFile(id) {
  const p = jobPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function writeJobFile(id, data) {
  const p = jobPath(id);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

/* ---------- Public API ---------- */

/**
 * Create a new job and return its ID.
 * All component statuses start as "pending".
 */
export function createJob(meta = {}) {
  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const job = {
    overall_status: "processing",  // processing | completed | failed
    text_status: "pending",        // pending | processing | completed | failed
    quiz_status: "pending",
    slide_status: "pending",
    audio_status: "pending",
    video_status: "pending",
    progress: "Starting...",
    result: {},
    error: null,
    meta,                          // { topic, duration, mode, part, language }
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeJobFile(id, job);
  return id;
}

/**
 * Update a job's fields (merges into existing data).
 * `result` field is deep-merged (Object.assign) so partial result updates work.
 */
export function updateJob(id, updates) {
  const job = readJobFile(id);
  if (!job) return;

  // Deep-merge result field
  if (updates.result && typeof updates.result === "object") {
    job.result = { ...(job.result || {}), ...updates.result };
    delete updates.result;
  }

  Object.assign(job, updates, { updatedAt: Date.now() });
  writeJobFile(id, job);
}

/**
 * Get a job by ID.
 */
export function getJob(id) {
  return readJobFile(id);
}

/**
 * Get all jobs (for startup recovery).
 */
export function getAllJobs() {
  try {
    const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith(".json"));
    return files.map(f => {
      const id = f.replace(".json", "");
      const job = readJobFile(id);
      return job ? { id, ...job } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Mark all in-progress jobs as failed (called on server startup).
 */
export function markInterruptedJobs() {
  const jobs = getAllJobs();
  let count = 0;
  for (const job of jobs) {
    if (job.overall_status === "processing") {
      updateJob(job.id, {
        overall_status: "failed",
        error: "Server restarted — job was interrupted",
        progress: "Interrupted by server restart",
      });
      count++;
      console.log(`⚠️ Marked interrupted job: ${job.id}`);
    }
  }
  if (count > 0) console.log(`⚠️ Marked ${count} interrupted job(s) as failed`);
}
