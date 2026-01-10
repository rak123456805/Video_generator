/* src/services/scriptToSlides.js */

export const scriptToSlides = (scriptData, options = {}) => {
  // If scriptData is already the array of slides (which it should be now), just return it.
  if (Array.isArray(scriptData)) {
    return scriptData.map(slide => ({
      title: slide.title || "Topic",
      bullets: slide.bullets || [],
      wordCount: slide.wordCount || 0,
      narration: slide.narration || "", // Keep narration for TTS
      imagePrompt: slide.imagePrompt || ""
    }));
  }

  // Fallback for string input (legacy check)
  return [];
};
