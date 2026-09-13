# Backend Dockerfile for Edu Video Generator
# Requires FFmpeg and Puppeteer (Chromium) for video generation.
# No Python needed — TTS is handled entirely by the Node msedge-tts package.

FROM node:20-slim

# Install system dependencies for FFmpeg and Puppeteer.
# Python / pip / edge-tts have been removed: the Node msedge-tts package
# communicates with the Microsoft Edge TTS service over HTTPS and requires
# no local Python toolchain.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_BIN=/usr/bin/chromium

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create generated folder and jobs subfolder for persistence
RUN mkdir -p /app/generated/jobs

# Expose the backend port
EXPOSE 5000

# FIX 5 (stopgap): Relax the health check so a CPU-busy video generation job
# (Puppeteer + FFmpeg) does not trigger a container restart.
# The health endpoint (GET /) is a trivial string response that never touches
# the event loop under load, so the only reason it would fail is if the process
# has truly crashed.
#
# ⚠️  STOPGAP NOTE: This buys time for the web process to finish heavy jobs
#    without being killed. The proper long-term fix is to move video generation
#    to a dedicated Render Background Worker service — see DEPLOYMENT.md.
#
# Previous values: --interval=30s --timeout=10s --start-period=30s --retries=3
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

CMD ["node", "server.js"]
