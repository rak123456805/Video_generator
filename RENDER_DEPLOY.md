# 🚀 Deploying to Render (Docker-based)

This guide covers deploying the **Text-to-Video Generator** to [Render](https://render.com) using Docker.

---

## Prerequisites

- GitHub account with the project pushed to a repository
- Render account (free tier works, but **Starter** or higher recommended for video generation)
- Google API key for Gemini

---

## Architecture on Render

| Service | Type | Purpose |
|---------|------|---------|
| `edu-video-backend` | **Web Service** (Docker) | Node.js API + video generation |
| `edu-video-frontend` | **Static Site** or **Web Service** (Docker) | Vite-built React app |

---

## Step 1: Push to GitHub

```bash
cd Text_to_video_Generator
git init
git add .
git commit -m "Production-ready with Docker"
git remote add origin https://github.com/YOUR_USERNAME/text-to-video-generator.git
git push -u origin main
```

---

## Step 2: Deploy the Backend

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `edu-video-backend` |
| **Root Directory** | `Text_to_video_Generator/backend` |
| **Runtime** | **Docker** |
| **Instance Type** | Starter ($7/mo) or higher |
| **Health Check Path** | `/` |

4. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `GOOGLE_API_KEY` | Your Google Gemini API key |
| `GEMINI_API_KEY` | Same as above |
| `PORT` | `5000` |
| `CORS_ORIGINS` | `https://YOUR-FRONTEND.onrender.com` |

5. Click **Create Web Service**

> ⚠️ **Important**: After the backend deploys, copy the service URL (e.g., `https://edu-video-backend.onrender.com`). You'll need it for the frontend.

---

## Step 3: Deploy the Frontend

### Option A: Static Site (Recommended)

1. Go to **New** → **Static Site**
2. Connect the same GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `edu-video-frontend` |
| **Root Directory** | `Text_to_video_Generator/frontend` |
| **Build Command** | `npm ci && npm run build` |
| **Publish Directory** | `dist` |

4. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://edu-video-backend.onrender.com` |
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

### Option B: Docker Web Service

1. Go to **New** → **Web Service**
2. Connect repository, configure:

| Setting | Value |
|---------|-------|
| **Name** | `edu-video-frontend` |
| **Root Directory** | `Text_to_video_Generator/frontend` |
| **Runtime** | **Docker** |
| **Docker Build Args** | `VITE_API_URL=https://edu-video-backend.onrender.com` |

---

## Step 4: Update Backend CORS

After deploying both services, update the backend's `CORS_ORIGINS` environment variable:

```
CORS_ORIGINS=https://edu-video-frontend.onrender.com
```

Replace with your actual frontend URL from Render.

---

## Step 5: Verify Deployment

1. Visit your frontend URL
2. Sign in and navigate to the Dashboard
3. Generate a test video — you should see real-time progress updates
4. Check the Quiz tab after video generation

---

## Local Docker Testing

Before deploying, test locally:

```bash
cd Text_to_video_Generator

# Create a .env file in the root with your API keys
echo "GOOGLE_API_KEY=your_key_here" > .env
echo "GEMINI_API_KEY=your_key_here" >> .env

# Build and run
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## Troubleshooting

### Video generation times out
The async job system prevents HTTP timeouts. If videos still fail:
- Upgrade to a higher Render instance (more RAM/CPU)
- Check backend logs in Render dashboard for errors

### CORS errors
- Verify `CORS_ORIGINS` on the backend includes your frontend URL (exact match, including `https://`)
- Don't add trailing slashes

### Puppeteer/Chromium issues
The Dockerfile installs Chromium and sets `PUPPETEER_EXECUTABLE_PATH`. If you see browser errors:
- Check the Render build logs for Chromium installation failures
- Ensure the instance has enough memory (≥ 512MB recommended)

### Cold starts on free tier
Render's free tier spins down after 15 minutes of inactivity. Use the Starter plan for production.
