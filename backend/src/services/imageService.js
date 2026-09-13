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
    // Image generation is currently disabled to optimize render time & resources
    return false;

    // When image generation is enabled: TextRank prioritizes key concepts for visual assets
    /*
    // Skip concluding slides
    if (index >= totalSlides - 2) {
      return false;
    }
  
    // Skip if no image prompt
    if (!slide.imagePrompt || !slide.imagePrompt.trim()) {
      return false;
    }

    // Skip slides with standard recap/conclusion titles
    const skipKeywords = ['conclusion', 'summary', 'thank you', 'recap', 'review', 'q&a'];
    const titleLower = (slide.title || '').toLowerCase();
    if (skipKeywords.some(keyword => titleLower.includes(keyword))) {
      return false;
    }

    // Prioritize slides marked with 'high' visual emphasis by TextRank
    if (slide.visualEmphasis === 'high' || (slide.importanceScore && slide.importanceScore > 0.15)) {
      return true;
    }
  
    // Fallback: Generate for top-ranked slides up to max 6 slides
    return (slide.textRankRank && slide.textRankRank <= 6);
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
