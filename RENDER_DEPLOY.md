# 🚀 Deploying to Render (Docker-based)

This guide covers deploying the **Text-to-Video Generator** to [Render](https://render.com) using Docker. The backend is refactored to be fully asynchronous and uses file-based persistence, which requires specific configuration on Render.

---

## Prerequisites

- GitHub account with the project pushed to a repository
- Render account (free tier works, but **Starter** or higher is **highly recommended** for video generation performance)
- Google API key for Gemini 2.5 Flash

---

## Architecture on Render

| Service | Type | Purpose |
|---------|------|---------|
| `backend` | **Web Service** (Docker) | Node.js API + FFmpeg/Puppeteer pipeline |
| `frontend` | **Static Site** or **Web Service** | Vite React app |
| **Disk** | **Persistent Storage** | Stores `/app/generated` (jobs, videos, quizzes) |

---

## Step 1: Deploy the Backend

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repository.
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `edu-video-backend` |
| **Root Directory** | `backend` |
| **Runtime** | **Docker** |
| **Instance Type** | Starter ($7/mo) or higher |
| **Health Check Path** | `/` |

4. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `GOOGLE_API_KEY` | Your Google Gemini API key |
| `PORT` | `5000` |
| `CORS_ORIGINS` | `https://your-frontend.onrender.com` (Add this later) |

5. Click **Create Web Service**.

### Step 2: Add Persistent Disk (CRITICAL)

The backend saves job status and results to disk. Without a persistent disk, jobs will be lost every time the server restarts or redeploys.

1. In the `edu-video-backend` dashboard, go to **Disks**.
2. Click **Add Disk**.
3. Configure:
   - **Name**: `generated-data`
   - **Mount Path**: `/app/generated`
   - **Size**: 1 GB (minimum)
4. Click **Save Changes**.

---

## Step 3: Deploy the Frontend

### Option A: Static Site (Recommended)

1. Go to **New** → **Static Site**.
2. Connect your GitHub repository.
3. Configure:
   - **Name**: `edu-video-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variable**:
   - `VITE_API_URL`: `https://edu-video-backend.onrender.com`

---

## Step 4: Final Configuration

1. **Update Backend CORS**: Go back to your `backend` service settings and update `CORS_ORIGINS` to include your new frontend URL.
2. **Verify Async Flow**: 
   - Start a generation.
   - You should see the progress grid (Text → Quiz/Slides/Audio → Video).
   - If the server restarts, the job will stay in the "generated/jobs" disk and can be recovered/viewed later.

---

## Troubleshooting

### Video generation fails / Memory limits
Render's Free tier (512MB) might struggle with FFmpeg and Puppeteer concurrently. If you see "Pipeline failed" or "Internal Server Error":
- Upgrade to the **Starter** plan (1GB RAM).
- Check the **Events** tab in Render to see if the process was "OOM Killed" (Out of Memory).

### Puppeteer Issues
The Dockerfile is pre-configured to install Chromium and set path variables. If you see "Chromium not found":
- Ensure you chose **Runtime: Docker** during setup.
- Verify the `backend/Dockerfile` has the `PUPPETEER_EXECUTABLE_PATH` env var set correctly.

### Persistent job storage
If you refresh the page and the "Generating..." state is gone, ensure the **Disk** is correctly mounted to `/app/generated`. The frontend uses the `jobId` to poll the status; if the file is missing from the disk, the job will fail.

---

## Local Testing (Before Push)

```bash
docker-compose up --build
```
- Backend: http://localhost:5000
- Frontend: http://localhost:3000
