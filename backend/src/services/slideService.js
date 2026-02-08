/* src/services/slideService.js */

import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { scriptToSlides } from "./scriptToSlides.js";
import { generateImagesForSlides } from "./imageService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root = .../backend/src  -> go up two levels -> .../backend
const BACKEND_ROOT = path.resolve(__dirname, "..", "..");

/* --------------------------------------------------
   Render-safe Puppeteer Chrome resolver (v24 compatible)
-------------------------------------------------- */

function exists(p) {
  try {
    return Boolean(p) && fs.existsSync(p);
  } catch {
    return false;
  }
}

function resolveChromeExecutablePath() {
  // 1) Env var override (best)
  const envPathRaw = process.env.PUPPETEER_EXECUTABLE_PATH;
  const envPath = typeof envPathRaw === "string" ? envPathRaw.trim() : "";
  if (envPath) {
    if (exists(envPath)) {
      console.log(`✅ Using Chrome from PUPPETEER_EXECUTABLE_PATH: ${envPath}`);
      return envPath;
    }
    console.warn(`⚠️ PUPPETEER_EXECUTABLE_PATH set but not found: ${envPath}`);
  }

  // 2) Puppeteer cache paths (Render + local)
  // Puppeteer v24 installs to:
  // <cacheDir>/
  //   chrome/
  //     linux-<buildId>/chrome-linux64/chrome
  //     win64-<buildId>/chrome.exe (Windows)
  const candidates = [
    process.env.PUPPETEER_CACHE_DIR?.trim(),
    "/opt/render/.cache/puppeteer",
    path.join(process.env.HOME || "", ".cache", "puppeteer"),
    path.join(process.env.USERPROFILE || "", ".cache", "puppeteer"),
    path.join(BACKEND_ROOT, ".cache", "puppeteer"),
  ].filter(Boolean);

  console.log("🔍 Searching for Chrome in candidates:", candidates);

  for (const base of candidates) {
    try {
      const chromeRoot = path.join(base, "chrome");
      if (!exists(chromeRoot)) {
        console.log(`📂 Not found: ${chromeRoot}`);
        continue;
      }

      // directories like: linux-123456, win64-123456...
      const platformDirs = fs
        .readdirSync(chromeRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && (d.name.startsWith("linux-") || d.name.startsWith("win")))
        .map((d) => d.name)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

      console.log(`📁 Found platform dirs in ${chromeRoot}:`, platformDirs);

      for (const d of platformDirs) {
        const baseDir = path.join(chromeRoot, d);

        const possibleExes = [];
        if (d.startsWith("linux-")) {
          possibleExes.push(
            // Puppeteer 20+ typically
            path.join(baseDir, "chrome-linux64", "chrome"),
            // older layouts
            path.join(baseDir, "chrome-linux", "chrome"),
            // rare layout fallback
            path.join(baseDir, "chrome")
          );
        } else if (d.startsWith("win")) {
          possibleExes.push(
            // Windows Chrome (Puppeteer v24+ structure)
            path.join(baseDir, "chrome-win64", "chrome.exe"),
            // Fallback: older structure
            path.join(baseDir, "chrome.exe")
          );
        }

        for (const exe of possibleExes) {
          if (exists(exe)) {
            console.log(`✅ Chrome executable found: ${exe}`);
            return exe;
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Chrome scan failed for base=${base}: ${e?.message}`);
    }
  }

  // 3) System Chrome/Chromium
  const systemPaths = [];
  if (process.platform === "win32") {
    systemPaths.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    );
  } else {
    systemPaths.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium"
    );
  }

  for (const p of systemPaths) {
    if (exists(p)) {
      console.log(`✅ Found system Chrome/Chromium: ${p}`);
      return p;
    }
  }

  return null;
}

/**
 * MAIN SLIDE GENERATOR
 */
export const generateSlides = async (script, slideFolder, language = "en") => {
  /* --------------------------------------------------
     1️⃣ Output directory
     IMPORTANT: Use backend/generated so it matches server static path.
  -------------------------------------------------- */
  const outputDir = path.join(BACKEND_ROOT, "generated", slideFolder);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  /* --------------------------------------------------
     2️⃣ Script → slide data
  -------------------------------------------------- */
  const slideData = scriptToSlides(script, {
    minBullets: 2,
    maxBullets: 4,
    wordsPerBullet: language === "en" ? 16 : 14,
    maxSlides: 72,
  });

  console.log(`🚀 Generating ${slideData.length} slides for language: ${language}`);
  if (!slideData.length) return [];

  /* --------------------------------------------------
     3️⃣ Puppeteer setup (Render-safe)
  -------------------------------------------------- */
  const chromePath = resolveChromeExecutablePath();

  console.log("🧩 Puppeteer launch config:", {
    hasExecutablePathEnv: Boolean(process.env.PUPPETEER_EXECUTABLE_PATH?.trim()),
    resolvedChromePath: chromePath || "(not found)",
    resolvedPathExists: chromePath ? fs.existsSync(chromePath) : false,
    cacheDir: process.env.PUPPETEER_CACHE_DIR || "(default)",
  });

  if (!chromePath) {
    throw new Error(
      "Chrome executable not found. On Render, ensure your build runs:\n" +
      "  npx puppeteer browsers install chrome\n" +
      "and set PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer\n" +
      "OR install system chromium and set PUPPETEER_EXECUTABLE_PATH."
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  } catch (err) {
    console.error("❌ FAILED TO LAUNCH PUPPETEER:", err);
    throw new Error(
      `Puppeteer launch failed. Chrome path: ${chromePath}. Error: ${err?.message || err}`
    );
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  /* --------------------------------------------------
     4️⃣ Load HTML template
  -------------------------------------------------- */
  const templatePath = path.join(__dirname, "slideTemplate.html");

  if (!fs.existsSync(templatePath)) {
    await browser.close();
    throw new Error("slideTemplate.html not found");
  }

  const htmlTemplate = fs.readFileSync(templatePath, "utf8");
  const generatedImages = [];

  /* --------------------------------------------------
     4.5️⃣ Generate images for slides (in parallel)
  -------------------------------------------------- */
  console.log("🎨 Generating images for slides...");
  const imagePaths = await generateImagesForSlides(slideData, outputDir);

  /* --------------------------------------------------
     5️⃣ Render slides
  -------------------------------------------------- */
  for (let i = 0; i < slideData.length; i++) {
    const slide = slideData[i];

    const bulletHtml = slide.bullets
      .map((b) => `<div class="bullet">${escapeHtml(b)}</div>`)
      .join("");

    let examplesHtml = "";
    if (slide.examples && slide.examples.length > 0) {
      const exampleItems = slide.examples
        .map((ex) => `<div class="example-item">${escapeHtml(ex)}</div>`)
        .join("");
      examplesHtml = `
        <div class="examples-section">
          <div class="examples-title">Examples</div>
          ${exampleItems}
        </div>`;
    }

    let imageHtml = "";
    let hasImageClass = "";
    if (imagePaths[i]) {
      try {
        const imageBuffer = fs.readFileSync(imagePaths[i]);
        const base64Image = imageBuffer.toString("base64");
        const mimeType = "image/png";
        imageHtml = `
          <div class="slide-image-container">
            <img class="slide-image" src="data:${mimeType};base64,${base64Image}" alt="Slide illustration" />
          </div>`;
        hasImageClass = " has-image";
      } catch (err) {
        console.warn(`⚠️ Failed to embed image for slide ${i + 1}: ${err.message}`);
      }
    }

    // Insert slide content into template
    const finalHtml = htmlTemplate.replace(
      '<div class="slide" id="slide">',
      `<div class="slide${hasImageClass}" id="slide"
        style="
          font-family:${getFontFamily(language)};
          transform: scale(${getFontScale(language)});
          transform-origin: top left;
        ">
        <div class="title">${escapeHtml(slide.title)}</div>
        <div class="bullets">${bulletHtml}</div>
        ${examplesHtml}
        ${imageHtml}`
    );

    await page.setContent(finalHtml, { waitUntil: "domcontentloaded" });

    // Wait for fonts (best-effort)
    try {
      await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        await document.fonts.ready;
      });
    } catch {
      // ignore
    }

    const fileName = `slide_${i + 1}.png`;
    const filePath = path.join(outputDir, fileName);

    await page.screenshot({ path: filePath });

    console.log(`✅ Saved: ${fileName}`);
    generatedImages.push(filePath);
  }

  /* --------------------------------------------------
     6️⃣ Cleanup
  -------------------------------------------------- */
  await browser.close();

  return generatedImages;
};

/* ==================================================
   HELPERS
================================================== */

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFontFamily(lang) {
  const fonts = {
    hi: "DevanagariFont",
    mr: "DevanagariFont",
    kn: "KannadaFont",
    ta: "TamilFont",
    te: "TeluguFont",
    ml: "MalayalamFont",
    bn: "BengaliFont",
    en: "sans-serif",
  };
  return fonts[lang] || "sans-serif";
}

function getFontScale(lang) {
  const scale = {
    hi: 1.15,
    mr: 1.15,
    kn: 1.18,
    ta: 1.15,
    te: 1.15,
    ml: 1.2,
    bn: 1.15,
    en: 1.0,
  };
  return scale[lang] || 1.0;
}
