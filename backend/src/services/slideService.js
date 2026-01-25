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
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();

  console.log("🧩 Puppeteer launch config:", {
    hasExecutablePathEnv: Boolean(executablePath),
    executablePath: executablePath || "(default)",
    cacheDir: process.env.PUPPETEER_CACHE_DIR || "(default)",
  });

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: executablePath || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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
      .map((b) => `<div class="bullet">${b}</div>`)
      .join("");

    // Generate examples HTML if examples exist
    let examplesHtml = "";
    if (slide.examples && slide.examples.length > 0) {
      const exampleItems = slide.examples
        .map((ex) => `<div class="example-item">${ex}</div>`)
        .join("");
      examplesHtml = `
        <div class="examples-section">
          <div class="examples-title">Examples</div>
          ${exampleItems}
        </div>`;
    }

    // Generate image HTML if image exists
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

    const finalHtml = htmlTemplate.replace(
      '<div class="slide" id="slide">',
      `<div class="slide${hasImageClass}" id="slide"
        style="
          font-family:${getFontFamily(language)};
          transform: scale(${getFontScale(language)});
          transform-origin: top left;
        ">
        <div class="title">${slide.title}</div>
        <div class="bullets">${bulletHtml}</div>
        ${examplesHtml}
        ${imageHtml}`
    );

    await page.setContent(finalHtml);
    await page.evaluateHandle("document.fonts.ready");

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
   FONT FAMILY PER LANGUAGE
================================================== */

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

/* ==================================================
   FONT SCALE PER LANGUAGE
================================================== */

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
