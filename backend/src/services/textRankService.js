/* src/services/textRankService.js — Algorithmic TextRank NLP & Scene Planning */

/**
 * Standard English Stopwords List
 */
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
  "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
  "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
  "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
  "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
  "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
  "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
  "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under",
  "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
  "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
  "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
  "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
  "your", "yours", "yourself", "yourselves", "also", "just", "like", "will",
  "even", "well", "using", "use", "used", "uses"
]);

/* ==========================================================================
   STEP 1: SENTENCE PREPROCESSING & TOKENIZATION
   ========================================================================== */

/**
 * Splits raw text into an array of individual sentences.
 * Handles periods, exclamation marks, question marks, and newlines.
 *
 * @param {string} text - Raw input text
 * @returns {string[]} Array of non-empty raw sentences
 */
export function splitIntoSentences(text) {
  if (!text || typeof text !== "string") return [];

  // Replace multiple newlines/whitespace with clean spacing
  const cleaned = text.trim();
  if (!cleaned) return [];

  // Match sentences ending in ., !, ?, or newlines, ignoring common abbreviations
  // Split on sentence boundaries
  const rawSentences = cleaned
    .replace(/([.?!])\s*(?=[A-Z0-9"']|$)/g, "$1|SPLIT|")
    .replace(/\n+/g, "|SPLIT|")
    .split("|SPLIT|")
    .map(s => s.trim())
    .filter(s => s.length > 3); // ignore ultra-short fragments

  return rawSentences;
}

/**
 * Tokenizes and preprocesses a sentence:
 * - Converts to lowercase
 * - Strips punctuation and symbols
 * - Filters out stopwords and short tokens (< 2 chars)
 *
 * @param {string} sentence - Raw sentence
 * @returns {string[]} Array of cleaned word tokens
 */
export function preprocessSentence(sentence) {
  if (!sentence || typeof sentence !== "string") return [];

  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ") // replace punctuation with spaces
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

/* ==========================================================================
   STEP 2: NUMERICAL REPRESENTATION (TF-IDF VECTORS)
   ========================================================================== */

/**
 * Builds vocabulary and computes TF-IDF vectors for a list of tokenized sentences.
 *
 * @param {Array<{ tokens: string[] }>} processedSentences
 * @returns {{ vocabulary: string[], vectors: number[][] }}
 */
export function computeTfIdfVectors(processedSentences) {
  const N = processedSentences.length;
  if (N === 0) return { vocabulary: [], vectors: [] };

  // 1. Build Vocabulary
  const vocabSet = new Set();
  const docFreq = new Map(); // term -> number of sentences containing term

  processedSentences.forEach(({ tokens }) => {
    const seenInDoc = new Set(tokens);
    seenInDoc.forEach(term => {
      vocabSet.add(term);
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    });
  });

  const vocabulary = Array.from(vocabSet);
  const vocabIndex = new Map(vocabulary.map((term, i) => [term, i]));
  const V = vocabulary.length;

  if (V === 0) {
    return {
      vocabulary: [],
      vectors: processedSentences.map(() => [])
    };
  }

  // 2. Compute IDF for each vocabulary term: smoothed IDF = ln((N + 1) / (DF + 1)) + 1
  const idf = new Array(V);
  vocabulary.forEach((term, i) => {
    const df = docFreq.get(term) || 0;
    idf[i] = Math.log((N + 1) / (df + 1)) + 1;
  });

  // 3. Compute TF-IDF vector for each sentence
  const vectors = processedSentences.map(({ tokens }) => {
    const vector = new Array(V).fill(0);
    const totalTerms = tokens.length;
    if (totalTerms === 0) return vector;

    // Count Term Frequency (TF)
    const termCounts = new Map();
    tokens.forEach(term => {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    });

    // TF * IDF
    termCounts.forEach((count, term) => {
      const idx = vocabIndex.get(term);
      if (idx !== undefined) {
        const tf = count / totalTerms;
        vector[idx] = tf * idf[idx];
      }
    });

    return vector;
  });

  return { vocabulary, vectors };
}

/* ==========================================================================
   STEP 3 & 4: SENTENCE SIMILARITY & GRAPH CONSTRUCTION
   ========================================================================== */

/**
 * Computes cosine similarity between two numerical vectors:
 * similarity(A, B) = (A · B) / (||A|| * ||B||)
 *
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Cosine similarity in range [0, 1]
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, similarity)); // Clamp to [0, 1]
}

/**
 * Builds an adjacency matrix (Sentence Graph) where edge weights
 * are the cosine similarities between sentences above the threshold.
 *
 * @param {number[][]} vectors - TF-IDF vectors for all sentences
 * @param {number} threshold - Minimum similarity threshold (default 0.05)
 * @returns {number[][]} N x N adjacency matrix
 */
export function buildSentenceGraph(vectors, threshold = 0.05) {
  const N = vectors.length;
  const matrix = Array.from({ length: N }, () => new Array(N).fill(0));

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const sim = cosineSimilarity(vectors[i], vectors[j]);
      if (sim >= threshold) {
        matrix[i][j] = sim;
        matrix[j][i] = sim; // undirected graph
      }
    }
  }

  return matrix;
}

/* ==========================================================================
   STEP 5: TEXTRANK / PAGERANK POWER ITERATION
   ========================================================================== */

/**
 * Runs TextRank power iteration over the sentence graph.
 *
 * Formula:
 * Score(Vi) = (1 - d) + d * Σ [ W(Vj, Vi) / Σ W(Vj, Vk) * Score(Vj) ]
 *
 * @param {number[][]} graph - N x N adjacency matrix with edge weights
 * @param {Object} options
 * @param {number} [options.damping=0.85] - Damping factor (standard PageRank: 0.85)
 * @param {number} [options.maxIterations=100] - Max iterations before termination
 * @param {number} [options.convergenceThreshold=1e-5] - Convergence epsilon
 * @returns {number[]} Array of converged importance scores for each sentence index
 */
export function calculateTextRank(graph, options = {}) {
  const {
    damping = 0.85,
    maxIterations = 100,
    convergenceThreshold = 1e-5,
  } = options;

  const N = graph.length;
  if (N === 0) return [];
  if (N === 1) return [1.0];

  // Calculate sum of outgoing weights for each node j: OutWeight(j) = Σ W(j, k)
  const outWeights = new Array(N).fill(0);
  for (let j = 0; j < N; j++) {
    let sum = 0;
    for (let k = 0; k < N; k++) {
      sum += graph[j][k];
    }
    outWeights[j] = sum;
  }

  // Initialize all vertex scores equally: Score^(0)(Vi) = 1.0
  let scores = new Array(N).fill(1.0);

  // Iterative Power Method
  for (let iter = 0; iter < maxIterations; iter++) {
    const nextScores = new Array(N).fill(0);
    let maxDelta = 0;

    for (let i = 0; i < N; i++) {
      let sumOfNeighbors = 0;

      for (let j = 0; j < N; j++) {
        if (i !== j && graph[j][i] > 0 && outWeights[j] > 0) {
          sumOfNeighbors += (graph[j][i] / outWeights[j]) * scores[j];
        }
      }

      nextScores[i] = (1 - damping) + damping * sumOfNeighbors;
      const delta = Math.abs(nextScores[i] - scores[i]);
      if (delta > maxDelta) {
        maxDelta = delta;
      }
    }

    scores = nextScores;

    // Check for convergence
    if (maxDelta < convergenceThreshold) {
      break;
    }
  }

  return scores;
}

/* ==========================================================================
   STEP 6: RANK SENTENCES & FORMAT OUTPUT
   ========================================================================== */

/**
 * Runs full TextRank pipeline on raw text or an array of sentences.
 *
 * @param {string|string[]} input - Raw text or array of sentence strings
 * @param {Object} [options]
 * @returns {{
 *   sentenceCount: number,
 *   rankedSentences: Array<{
 *     index: number,
 *     sentence: string,
 *     score: number,
 *     normalizedScore: number,
 *     rank: number
 *   }>,
 *   graphSummary: { nodes: number, edges: number, density: number },
 *   executionTimeMs: number
 * }}
 */
export function rankSentences(input, options = {}) {
  const startTime = performance.now();

  let rawSentences = [];
  if (Array.isArray(input)) {
    rawSentences = input.map(s => String(s || "").trim()).filter(s => s.length > 0);
  } else if (typeof input === "string") {
    rawSentences = splitIntoSentences(input);
  }

  if (rawSentences.length === 0) {
    return {
      sentenceCount: 0,
      rankedSentences: [],
      graphSummary: { nodes: 0, edges: 0, density: 0 },
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
    };
  }

  // Preprocess
  const processed = rawSentences.map((sentence, index) => ({
    index,
    raw: sentence,
    tokens: preprocessSentence(sentence),
  }));

  // TF-IDF
  const { vectors } = computeTfIdfVectors(processed);

  // Graph
  const threshold = options.threshold ?? 0.05;
  const graph = buildSentenceGraph(vectors, threshold);

  // Compute edge count for summary
  const N = rawSentences.length;
  let edgeCount = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (graph[i][j] > 0) edgeCount++;
    }
  }
  const maxPossibleEdges = (N * (N - 1)) / 2;
  const density = maxPossibleEdges > 0 ? Number((edgeCount / maxPossibleEdges).toFixed(4)) : 0;

  // TextRank
  const rawScores = calculateTextRank(graph, options);

  // Normalize scores to sum to 1.0 (or max score = 1.0)
  const scoreSum = rawScores.reduce((a, b) => a + b, 0) || 1;
  const maxScore = Math.max(...rawScores, 1);

  // Combine with original indices
  const results = rawSentences.map((sentence, index) => ({
    index,
    sentence,
    score: Number((rawScores[index] || 0).toFixed(6)),
    normalizedScore: Number(((rawScores[index] || 0) / scoreSum).toFixed(6)),
    relativeScore: Number(((rawScores[index] || 0) / maxScore).toFixed(4)),
  }));

  // Sort descending to assign ranks
  const sorted = [...results].sort((a, b) => b.score - a.score);
  sorted.forEach((item, rankIdx) => {
    item.rank = rankIdx + 1;
  });

  const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

  return {
    sentenceCount: N,
    rankedSentences: sorted,
    graphSummary: { nodes: N, edges: edgeCount, density },
    executionTimeMs,
  };
}

/* ==========================================================================
   STEP 7: INTELLIGENT SCENE PLANNING INTEGRATION
   ========================================================================== */

/**
 * Plans and prioritizes scenes/slides using TextRank analysis.
 *
 * Enriches each slide with:
 * - importanceScore: Aggregated TextRank score for the slide
 * - textRankRank: Overall importance rank of this scene
 * - visualEmphasis: "high" | "medium" | "standard"
 * - keyConcepts: Top ranked key sentences/concepts in this scene
 * - highlightSentence: The single most central sentence of the slide
 *
 * NOTE: Preserves 100% of educational content while adding intelligent metadata.
 *
 * @param {Array<Object>} scriptSlides - Slides array from generateAIScript
 * @param {Object} [options]
 * @returns {Array<Object>} Enriched slides with TextRank metadata
 */
export function planScenesWithTextRank(scriptSlides, options = {}) {
  if (!Array.isArray(scriptSlides) || scriptSlides.length === 0) {
    return scriptSlides || [];
  }

  // 1. Collect all narration & bullet sentences across all slides
  const sentenceToSlideMap = [];
  const allSentences = [];

  scriptSlides.forEach((slide, slideIndex) => {
    const narrationSentences = splitIntoSentences(slide.narration || "");
    const bulletSentences = Array.isArray(slide.bullets)
      ? slide.bullets.map(b => String(b || "").trim()).filter(Boolean)
      : [];

    const combinedSlideSentences = [...narrationSentences, ...bulletSentences];

    // Fallback if slide has very brief text
    if (combinedSlideSentences.length === 0 && slide.title) {
      combinedSlideSentences.push(slide.title);
    }

    combinedSlideSentences.forEach(sentence => {
      sentenceToSlideMap.push({ slideIndex, sentence });
      allSentences.push(sentence);
    });
  });

  // 2. Run TextRank across the entire educational script corpus
  const textRankResult = rankSentences(allSentences, options);
  const sentenceScores = new Map();
  textRankResult.rankedSentences.forEach(item => {
    sentenceScores.set(item.sentence, item);
  });

  // 3. Aggregate importance scores per slide
  const slideScores = scriptSlides.map((slide, slideIndex) => {
    const slideItems = sentenceToSlideMap.filter(m => m.slideIndex === slideIndex);
    if (slideItems.length === 0) return { slideIndex, avgScore: 0.1, maxScore: 0.1, topSentences: [] };

    const scoredItems = slideItems
      .map(item => sentenceScores.get(item.sentence))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const sumScore = scoredItems.reduce((sum, item) => sum + item.score, 0);
    const avgScore = scoredItems.length > 0 ? sumScore / scoredItems.length : 0.1;
    const maxScore = scoredItems.length > 0 ? scoredItems[0].score : 0.1;

    return {
      slideIndex,
      avgScore,
      maxScore,
      topSentences: scoredItems.slice(0, 2).map(s => s.sentence),
    };
  });

  // 4. Calculate relative ranking across all slides
  const sortedSlideScores = [...slideScores].sort((a, b) => b.avgScore - a.avgScore);
  const totalSlides = scriptSlides.length;

  const slideRankMap = new Map();
  sortedSlideScores.forEach((item, rankIdx) => {
    const rank = rankIdx + 1;
    // Determine visual emphasis tier based on relative ranking percentile
    let visualEmphasis = "standard";
    const percentile = rank / totalSlides;
    if (percentile <= 0.35 || rank === 1) {
      visualEmphasis = "high";
    } else if (percentile <= 0.75) {
      visualEmphasis = "medium";
    }

    slideRankMap.set(item.slideIndex, {
      rank,
      importanceScore: Number(item.avgScore.toFixed(4)),
      visualEmphasis,
      keyConcepts: item.topSentences,
      highlightSentence: item.topSentences[0] || "",
    });
  });

  // 5. Enrich slides with TextRank metadata
  const enrichedSlides = scriptSlides.map((slide, slideIndex) => {
    const rankInfo = slideRankMap.get(slideIndex) || {
      rank: slideIndex + 1,
      importanceScore: 0.1,
      visualEmphasis: "standard",
      keyConcepts: [],
      highlightSentence: "",
    };

    return {
      ...slide,
      importanceScore: rankInfo.importanceScore,
      textRankRank: rankInfo.rank,
      visualEmphasis: rankInfo.visualEmphasis,
      keyConcepts: rankInfo.keyConcepts,
      highlightSentence: rankInfo.highlightSentence,
    };
  });

  // 6. Explainability Log
  logTextRankAnalysis({
    totalSentences: allSentences.length,
    totalSlides,
    rankedSentences: textRankResult.rankedSentences,
    enrichedSlides,
    executionTimeMs: textRankResult.executionTimeMs,
  });

  return enrichedSlides;
}

/* ==========================================================================
   STEP 9: EXPLAINABILITY & LOGGING
   ========================================================================== */

/**
 * Formats and logs the TextRank analysis results for development & presentation.
 *
 * @param {Object} summary
 */
export function logTextRankAnalysis(summary) {
  const { totalSentences, totalSlides, rankedSentences, enrichedSlides, executionTimeMs } = summary;

  console.log("\n=======================================================");
  console.log("📊 [TextRank NLP] Intelligent Scene Analysis");
  console.log(`⏱️  Completed in ${executionTimeMs}ms`);
  console.log(`📝 Total Sentences Analyzed: ${totalSentences}`);
  console.log(`🎬 Total Scenes/Slides: ${totalSlides}`);
  console.log("-------------------------------------------------------");
  console.log("🏆 Top 3 Central Concept Sentences (Global TextRank):");

  const top3 = (rankedSentences || []).slice(0, 3);
  top3.forEach((item, idx) => {
    const preview = item.sentence.length > 75 ? item.sentence.substring(0, 72) + "..." : item.sentence;
    console.log(`  ${idx + 1}. [Score: ${item.score.toFixed(4)}] "${preview}"`);
  });

  console.log("-------------------------------------------------------");
  console.log("🎯 Scene Importance & Visual Emphasis Breakdown:");
  (enrichedSlides || []).forEach((slide, idx) => {
    const tag = slide.visualEmphasis === "high" ? "🌟 [HIGH]" : slide.visualEmphasis === "medium" ? "🔷 [MED]" : "⚪ [STD]";
    console.log(`  Scene ${idx + 1} (Rank #${slide.textRankRank}): ${tag} Score: ${slide.importanceScore} — "${slide.title}"`);
  });
  console.log("=======================================================\n");
}
