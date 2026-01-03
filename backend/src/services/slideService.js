import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const FONT_BY_LANGUAGE = {
  kn: "KannadaFont",
  hi: "DevanagariFont",
  mr: "DevanagariFont",
  ta: "TamilFont",
  te: "TeluguFont",
  ml: "MalayalamFont",
  bn: "BengaliFont",
};

export const generateSlides = async (
  slides,
  outputFolder,
  topic,
  language = "en"
) => {
  const outputDir = path.join(process.cwd(), "generated", outputFolder);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();
  const templatePath = path.join(
    process.cwd(),
    "src/services/slideTemplate.html"
  );

  const fontFamily =
    FONT_BY_LANGUAGE[language] || FONT_BY_LANGUAGE.kn;

  const slidePaths = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    const html = fs
      .readFileSync(templatePath, "utf-8")
      .replace(
        `<div class="slide" id="slide">`,
        `<div class="slide" id="slide" style="font-family:${fontFamily}">`
      );

    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluate((slide) => {
      const container = document.getElementById("slide");
      container.innerHTML = `
        <div class="title">${slide.title}</div>
        ${slide.bullets
          .map((b) => `<div class="bullet">• ${b}</div>`)
          .join("")}
      `;
    }, slide);

    const filePath = path.join(outputDir, `slide-${i + 1}.png`);
    await page.screenshot({ path: filePath });
    slidePaths.push(filePath);
  }

  await browser.close();
  return slidePaths;
};
