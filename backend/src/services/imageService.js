/* src/services/imageService.js */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

/**
 * Generate an image (currently disabled - returns null)
 * @param {string} prompt - The image generation prompt
 * @param {string} outputPath - Where to save the generated image
 * @returns {Promise<string>} - Path to the generated image
 */
export const generateImage = async (prompt, outputPath) => {
    // Image generation is currently disabled
    // To enable: integrate with an image generation API like:
    // - Google Imagen (requires special access)
    // - DALL-E (requires OpenAI API key)
    // - Stable Diffusion (requires setup)

    console.log(`⏭️  Skipping image generation: "${prompt.substring(0, 50)}..."`);
    return null;
};

/**
 * Check if a slide should have an image based on its content
 * @param {Object} slide - Slide object
 * @param {number} index - Slide index
 * @param {number} totalSlides - Total number of slides
 * @returns {boolean}
 */
const shouldGenerateImage = (slide, index, totalSlides) => {
    // Image generation is disabled
    return false;

    // Uncomment below when image generation is enabled:
    /*
    // Skip last 3 slides (usually conclusion/summary/thank you)
    if (index >= totalSlides - 3) {
      return false;
    }
  
    // Only generate for first 7 slides maximum
    if (index >= 7) {
      return false;
    }
  
    // Skip if no imagePrompt
    if (!slide.imagePrompt || !slide.imagePrompt.trim()) {
      return false;
    }
  
    // Skip slides with certain keywords in title (conclusion, summary, etc.)
    const skipKeywords = ['conclusion', 'summary', 'thank', 'recap', 'review', 'end'];
    const titleLower = (slide.title || '').toLowerCase();
    if (skipKeywords.some(keyword => titleLower.includes(keyword))) {
      return false;
    }
  
    return true;
    */
};

/**
 * Generate images for selected slides only
 * @param {Array} slides - Array of slide objects with imagePrompt
 * @param {string} outputDir - Directory to save images
 * @returns {Promise<Array>} - Array of image paths (null for skipped/failed generations)
 */
export const generateImagesForSlides = async (slides, outputDir) => {
    console.log(`🎨 Image generation is currently disabled`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Return array of nulls (no images generated)
    const results = new Array(slides.length).fill(null);

    console.log(`⏭️  Skipped image generation for all ${slides.length} slides`);

    return results;
};
