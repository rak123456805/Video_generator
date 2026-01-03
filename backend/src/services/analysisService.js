const estimateComplexity = (topic) => {
  const t = topic.toLowerCase();

  // Very simple / narrow topics
  if (
    t.includes("basics") ||
    t.includes("introduction") ||
    t.includes("overview") ||
    t.includes("syntax")
  ) return 1;

  // Medium complexity
  if (
    t.includes("css") ||
    t.includes("html") ||
    t.includes("javascript") ||
    t.includes("box model") ||
    t.includes("flexbox")
  ) return 3;

  // High complexity frontend frameworks
  if (
    t.includes("react") ||
    t.includes("angular") ||
    t.includes("vue")
  ) return 6;

  // Very high complexity topics
  if (
    t.includes("machine learning") ||
    t.includes("deep learning") ||
    t.includes("artificial intelligence") ||
    t.includes("blockchain")
  ) return 9;

  // Default
  return 5;
};

/**
 * Duration capacity (how much complexity can fit)
 */
const DURATION_CAPACITY = {
  "15min": 2,
  "30min": 4,
  "1hr": 6,
};

/**
 * Analyze topic size vs duration
 */
export const analyzeTopicSize = (topic, duration) => {
  const complexity = estimateComplexity(topic);
  const capacity = DURATION_CAPACITY[duration] || 2;

  const feasible = complexity <= capacity;

  // Estimate number of parts if FULL course is needed
  const estimatedParts = feasible
    ? 1
    : Math.ceil(complexity / capacity);

  return {
    feasible,
    estimatedParts,
    complexity,
    capacity,
  };
};