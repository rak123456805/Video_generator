const SIMPLE_KEYWORDS = [
  "what is",
  "introduction",
  "basics of",
  "overview of",
  "css box model",
  "html tags",
  "python variables"
];

const BIG_KEYWORDS = [
  "complete",
  "advanced",
  "full course",
  "master",
  "deep dive"
];

export const analyzeTopicFeasibility = (topic, duration) => {
  const t = topic.toLowerCase();

  if (BIG_KEYWORDS.some(k => t.includes(k))) {
    return {
      feasible: false,
      reason: "Topic too broad",
      recommendation: ["CRASH", "FULL"]
    };
  }

  if (SIMPLE_KEYWORDS.some(k => t.includes(k))) {
    return {
      feasible: true,
      recommendation: ["SINGLE"]
    };
  }

  // Default fallback
  if (duration === "15min") {
    return {
      feasible: false,
      recommendation: ["CRASH", "FULL"]
    };
  }

  return {
    feasible: true,
    recommendation: ["SINGLE"]
  };
};
