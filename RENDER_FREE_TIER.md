# 🚀 Deploying to Render (Free Tier / Student Guide)

This guide shows you how to deploy the **Text-to-Video Generator** using Render's **Free Tier**. As a student, you can run this successfully by following these specific tweaks for low-memory environments.

---

## ⚠️ Free Tier Limitations

Render's Free Tier has two main constraints you must be aware of:
1.  **No Persistent Disks**: You cannot attach a "Disk" to a Free service. This means your `generated/jobs` and `generated/videos` folders will be **wiped** every time the server spins down (after 15 minutes of inactivity).
2.  **512MB RAM Limit**: Video rendering is memory-intensive. Large videos (over 10-15 slides) might cause the server to crash (OOM).

---

## Step 1: Deploy the Backend (Free Web Service)

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New** → **Web Service**.
3. Connect your repository.
4. **Settings**:
   - **Name**: `edu-video-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
5. **Environment Variables**:
   - `GOOGLE_API_KEY`: Your Gemini API key.
   - `PORT`: `5000`
   - `CORS_ORIGINS`: `https://your-frontend-url.onrender.com` (Add this later).

---

## Step 2: Handling Persistence on Free Tier

Since you don't have a Persistent Disk:
- **Don't worry about Step 2.1 in the main guide.**
- The application will still work perfectly for "live" generation. 
- **The Catch**: If you generate a video, close the tab, and come back 30 minutes later, the record of that video will likely be gone because the Free instance "spins down" and resets its storage.
- **The Fix**: Download your videos immediately after they are generated!

---

## Step 3: Performance Tips for Students

To prevent the 512MB RAM limit from crashing your app:
1.  **Short Topics**: Start with "5 minute" or "Crash Course" modes. These use fewer slides and less memory.
2.  **Wait for Cold Starts**: The Free tier takes about 50-90 seconds to "wake up" the first time you visit it. Be patient if the first request fails.
3.  **One generation at a time**: Do not try to generate two videos simultaneously; the memory will definitely spike and crash.
4.  **Sequential Mode**: I have optimized the backend to run Quiz → Slides → Audio one-by-one (Sequential) instead of all at once. This keeps the memory usage low enough for the Free Tier.

---

## Step 4: Deploy the Frontend (Static Site)

Render's **Static Site** is always free and excellent for the React frontend:
1. **New** → **Static Site**.
2. **Root Directory**: `frontend`
3. **Build Command**: `npm ci && npm run build`
4. **Publish Directory**: `dist`
5. **Environment Variable**: `VITE_API_URL` = `https://your-backend-url.onrender.com`

---

## Troubleshooting (Free Tier)

### "Pipeline failed: FFmpeg failed..."
This usually means the server ran out of RAM. 
- **Try again** with a shorter duration.
- Ensure no other tabs are polling the server while it's rendering.

### "Server restarted — job failed"
Render's Free tier is low-priority. If their servers are busy, they might kill your process. 
- If this happens repeatedly, consider using an external database or a paid instance, but for most student projects, a simple "Retry" works.

---

## Summary for Students
This project is fully compatible with the Free Tier! You get the full async power and the beautiful UI, just remember to download your results before the server goes to sleep. 🎓🚀
