/* src/services/scriptToSlides.js */

const clean = (text = "") =>
  text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const scriptToSlides = (script) => {
  const slides = [];
  if (!script) return slides;

  const sections = script
    .split(/SECTION\s*:/i)
    .map(s => s.trim())
    .filter(Boolean);

  sections.forEach((section, sectionIndex) => {
    const lines = section
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    if (!lines.length) return;

    const title = clean(lines[0]);

    const bulletLines = lines.filter(
      l => /^[-*•]/.test(l) || /^\d+\./.test(l)
    );

    // ✅ BULLET MODE
    if (bulletLines.length) {
      let buffer = [];

      bulletLines.forEach((line) => {
        const bullet = clean(line.replace(/^[-*•\d.]+\s*/, ""));
        if (!bullet) return;

        buffer.push(bullet);

        if (buffer.length === 3) {
          slides.push({ title, bullets: [...buffer] });
          buffer = [];
        }
      });

      if (buffer.length) {
        slides.push({ title, bullets: buffer });
      }

      return;
    }

    // ✅ PARAGRAPH MODE (CRASH)
    const sentences = section
      .split(/[.!?।]\s+/)
      .map(clean)
      .filter(s => s.length > 30);

    for (let i = 0; i < sentences.length; i += 2) {
      slides.push({
        title: title || `Concept ${sectionIndex + 1}`,
        bullets: sentences.slice(i, i + 2),
      });
    }
  });

  return slides;
};
