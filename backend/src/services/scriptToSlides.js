/* src/services/scriptToSlides.js */

/**
 * Cleans slide text WITHOUT destroying Indian language Unicode.
 * Removes emojis, markdown, and unsafe symbols only.
 */
const cleanSlideText = (text) =>
  text
    // Remove emojis only (not all Unicode)
    .replace(
      /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu,
      ""
    )
    // Remove markdown artifacts
    .replace(/[#*_`]/g, "")
    // Normalize spaces
    .replace(/\s+/g, " ")
    .trim();

export const scriptToSlides = (script) => {
  const slides = [];

  // Split by SECTION:
  const rawSections = script
    .split(/SECTION\s*:?/i)
    .filter((s) => s.trim().length > 0);

  rawSections.forEach((sectionContent) => {
    const lines = sectionContent
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (!lines.length) return;

    const sectionTitle = cleanSlideText(lines[0]);
    let currentBullets = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const isBullet =
        /^[-*•]/.test(line) || /^\d+\./.test(line);

      if (!isBullet) continue;

      const bullet = cleanSlideText(
        line.replace(/^[-*•\d.]+\s*/, "")
      );

      if (!bullet) continue;

      // Max 4 bullets per slide
      if (currentBullets.length >= 4) {
        slides.push({
          title: sectionTitle + " (Cont.)",
          bullets: [...currentBullets],
        });
        currentBullets = [];
      }

      currentBullets.push(bullet);
    }

    if (currentBullets.length) {
      slides.push({
        title: sectionTitle,
        bullets: currentBullets,
      });
    }
  });

  // Fallback if SECTION format breaks
  if (!slides.length) {
    console.warn("⚠️ Fallback slide parsing used");

    const paragraphs = script
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 30);

    paragraphs.forEach((para, index) => {
      const sentences = para
        .split(/[.!?।]\s+/)
        .slice(0, 3)
        .map(cleanSlideText);

      slides.push({
        title: `Concept ${index + 1}`,
        bullets: sentences,
      });
    });
  }

  return slides;
};
