/* src/services/slideService.js */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export const generateSlides = async (
  slides,
  outputFolder,
  topic,
  language = "en"
) => {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error("No slides provided to generateSlides()");
  }

  const outputDir = path.join(process.cwd(), "generated", outputFolder);
  fs.mkdirSync(outputDir, { recursive: true });

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const slidePaths = [];

    for (let i = 0; i < slides.length; i++) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      page.setDefaultNavigationTimeout(0);

      const slide = slides[i];
      const title = slide.title || `Slide ${i + 1}`;
      const bullets = Array.isArray(slide.bullets) ? slide.bullets : [];

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
@font-face { font-family: KannadaFont; src: url("file://${process.cwd()}/fonts/NotoSansKannada-Bold.ttf"); }
@font-face { font-family: TamilFont; src: url("file://${process.cwd()}/fonts/NotoSansTamil-Bold.ttf"); }
@font-face { font-family: TeluguFont; src: url("file://${process.cwd()}/fonts/NotoSansTelugu-Bold.ttf"); }
@font-face { font-family: DevanagariFont; src: url("file://${process.cwd()}/fonts/NotoSansDevanagari-Bold.ttf"); }
@font-face { font-family: MalayalamFont; src: url("file://${process.cwd()}/fonts/NotoSansMalayalam-Bold.ttf"); }
@font-face { font-family: BengaliFont; src: url("file://${process.cwd()}/fonts/NotoSansBengali-Bold.ttf"); }
@font-face { font-family: NotoSans; src: url("file://${process.cwd()}/fonts/NotoSans-Regular.ttf"); }

body {
  margin: 0;
  width: 1280px;
  height: 720px;
  background: #0f172a;
  color: #f8fafc;
  font-family: NotoSans, KannadaFont, TamilFont, TeluguFont,
               DevanagariFont, MalayalamFont, BengaliFont, sans-serif;
}

.container { padding: 60px; }
h1 { font-size: 48px; color: #38bdf8; margin-bottom: 30px; }
li { font-size: 28px; margin-bottom: 18px; line-height: 1.4; }
</style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <ul>
      ${bullets.map(b => `<li>${b}</li>`).join("")}
    </ul>
  </div>
</body>
</html>
`;

      await page.setContent(html, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);

      const slidePath = path.join(outputDir, `slide-${i + 1}.png`);
      await page.screenshot({ path: slidePath });

      slidePaths.push(slidePath);
      await page.close();
    }

    return slidePaths;
  } finally {
    if (browser) await browser.close();
  }
};
