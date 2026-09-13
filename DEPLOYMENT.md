# Deployment Guide — Render

This document covers everything needed to run the AI Video Course Generator reliably on Render, including persistent storage, the two-service architecture, and the upgrade path to a proper job queue.

---

## 1. Render Disk Setup (REQUIRED)

> **Without a persistent Render Disk, every deploy/restart/spin-down wipes `/app/generated`, losing all generated videos and in-flight job state.**

### Steps

1. In the Render dashboard, open your **Web Service**.
2. Go to **Disks** → **Add Disk**.
3. Configure:
   - **Name**: `generated-disk` (any name)
   - **Mount Path**: `/app/generated`
   - **Size**: 5 GB minimum (each video ≈ 50–200 MB)
4. Click **Save**.
5. Add the environment variable to your service:
   ```
   RENDER_DISK_MOUNTED=true
   ```
6. Redeploy. The server will no longer print the ⚠️ storage warning on startup.

> **Note**: Free-tier Render services do not support Disks. You must be on a paid plan.

---

## 2. Single-Process Architecture (Current — Stopgap)

The app currently runs the full video-generation pipeline (Puppeteer + FFmpeg) **inside the same process as the Express web server**. This is the simplest deployment model but has two risks on Render:

| Risk | Mitigation Applied |
|---|---|
| Health check kills the container while FFmpeg is busy | Relaxed `HEALTHCHECK` to 60s/30s/60s/5 in Dockerfile |
| Render free-tier 10-minute request timeout | Use the async job pattern (frontend polls `/video/status/:id`) |
| OOM on 512 MB instances | Pipeline stages run sequentially (not in parallel) |

This is adequate for low-to-medium traffic. For production loads, see the two-service architecture below.

### render.yaml (single service)

```yaml
services:
  - type: web
    name: edu-video-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    disk:
      name: generated-disk
      mountPath: /app/generated
      sizeGB: 5
    envVars:
      - key: NODE_ENV
        value: production
      - key: RENDER_DISK_MOUNTED
        value: "true"
      - key: CORS_ORIGINS
        value: https://your-frontend.vercel.app
      # ... (see .env.example for full list)
```

---

## 3. Two-Service Architecture (Recommended for Production)

Split the app into two Render services that share the same persistent Disk:

```
[Frontend (Vercel)]
       |  POST /api/video/crash-course
       v
[API Web Service]  --- creates job record ---> /app/generated/jobs/<id>.json
       |  returns { jobId }               <--- (job state on shared Disk)
       |
       |  GET /api/video/status/:id
       v
[API Web Service]  --- reads job record ---> returns { status, progress, result }

[Background Worker Service]
       ^  polls /app/generated/jobs/ for pending jobs every 5 s
       |  runs Puppeteer + FFmpeg + TTS
       +-- writes completed result back to job record
```

### Step 1 — Add a job queue

Install BullMQ + a Redis provider (e.g. Upstash — has a free tier):

```bash
cd backend
npm install bullmq
```

Set `REDIS_URL` in both services' environment variables:
```
REDIS_URL=rediss://:your-password@your-upstash-host:6379
```

### Step 2 — Separate the worker entrypoint

Create `backend/worker.js`:

```js
// worker.js — runs the generation pipeline as a BullMQ worker.
// Start with: node worker.js
import { Worker } from 'bullmq';
import { runPipeline } from './src/services/pipelineService.js';

const connection = { url: process.env.REDIS_URL };

new Worker('video-generation', async (job) => {
  const { jobId, ...params } = job.data;
  await runPipeline({ jobId, ...params });
}, { connection });

console.log('Worker started');
```

Update `server.js` to enqueue instead of calling `runPipeline` directly:

```js
import { Queue } from 'bullmq';
const videoQueue = new Queue('video-generation', { connection: { url: process.env.REDIS_URL } });

// In the crash-course/full-course route handler:
await videoQueue.add('generate', { jobId, topic, duration, mode, part, language, userId });
```

### Step 3 — render.yaml (two services, shared disk)

```yaml
services:
  - type: web
    name: edu-video-api
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    disk:
      name: generated-disk
      mountPath: /app/generated
      sizeGB: 10
    envVars:
      - key: RENDER_DISK_MOUNTED
        value: "true"
      - key: REDIS_URL
        value: rediss://your-upstash-url

  - type: worker
    name: edu-video-worker
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    startCommand: node worker.js
    disk:
      name: generated-disk
      mountPath: /app/generated
      sizeGB: 10
    envVars:
      - key: RENDER_DISK_MOUNTED
        value: "true"
      - key: REDIS_URL
        value: rediss://your-upstash-url
```

> **Important**: Both services must mount the **same** Render Disk so the API can serve files that the worker wrote.

---

## 4. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | Auto-set by Render | Server port (default 5000) |
| `GOOGLE_API_KEY` | Yes | Gemini AI API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (backend only) |
| `GOOGLE_CLIENT_ID` | Drive only | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Drive only | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Drive only | OAuth callback URL |
| `GOOGLE_DRIVE_ENCRYPTION_KEY` | Drive only | 64-char hex key for token encryption |
| `FRONTEND_URL` | Yes | Frontend URL for OAuth redirects |
| `CORS_ORIGINS` | Yes | Comma-separated allowed CORS origins |
| `RENDER_DISK_MOUNTED` | Render only | Set to `true` after attaching a Disk |
| `REDIS_URL` | Worker arch | Redis/Upstash connection string |

---

## 5. Local Development

No changes to local dev workflow:

```bash
cd backend
npm run dev
```

The pipeline runs in-process. The `RENDER` env var is not set locally so the disk warning never fires.
