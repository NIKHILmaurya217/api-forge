/**
 * APIforge — Task Classifier
 * Classifies a prompt into a task type and complexity score.
 */

const TASK_PATTERNS = {
  CODING: [
    /\b(code|function|bug|fix|debug|implement|algorithm|program|script|class|method|api|endpoint|sql|query|regex|compile|syntax|error|exception|stack trace|typescript|javascript|python|java|c\+\+|rust|golang|react|node|express)\b/i,
  ],
  MATH: [
    /\b(calculate|solve|equation|integral|derivative|matrix|probability|statistics|algebra|geometry|theorem|proof|formula|compute|sum|product|factor|prime|graph theory|optimization|linear|differential)\b/i,
  ],
  WRITING: [
    /\b(write|essay|paragraph|summarize|paraphrase|rewrite|draft|article|blog|email|letter|grammar|punctuation|proofread|narrative|story|poem|creative|copy|content|headline|thesis)\b/i,
  ],
  ANALYSIS: [
    /\b(analyze|compare|evaluate|assess|explain|why|how does|what is the difference|pros and cons|advantages|disadvantages|review|critique|interpret|examine|investigate|study)\b/i,
  ],
  GENERAL: [],
};

/**
 * Classify the task type from a prompt string.
 * @param {string} prompt
 * @returns {string} task type
 */
function classifyTask(prompt) {
  const lower = prompt.toLowerCase();
  const scores = {};

  for (const [task, patterns] of Object.entries(TASK_PATTERNS)) {
    if (task === 'GENERAL') continue;
    let score = 0;
    for (const pattern of patterns) {
      const matches = lower.match(pattern);
      if (matches) score += matches.length;
    }
    scores[task] = score;
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : 'GENERAL';
}

/**
 * Compute a complexity score (0–100) based on prompt features.
 * @param {string} prompt
 * @returns {number} score
 */
function computeComplexity(prompt) {
  const words = prompt.trim().split(/\s+/).length;
  const sentences = prompt.split(/[.!?]+/).filter(Boolean).length;
  const avgWordLength = prompt.replace(/\s+/g, '').length / Math.max(words, 1);
  const hasCode = /```|`[^`]+`|def |function |class |import |#include/.test(prompt);
  const hasMultipleQuestions = (prompt.match(/\?/g) || []).length > 1;
  const hasSpecificTerms = /\b(architecture|distributed|concurrent|asynchronous|machine learning|neural|transformer|encryption|authentication|scalability)\b/i.test(prompt);
  const hasNested = /\b(but|however|although|moreover|furthermore|additionally|consequently|therefore)\b/i.test(prompt);

  let score = 0;

  // Length component (0-35)
  if (words < 10) score += 5;
  else if (words < 25) score += 15;
  else if (words < 60) score += 25;
  else if (words < 120) score += 30;
  else score += 35;

  // Vocabulary complexity (0-20)
  if (avgWordLength > 7) score += 20;
  else if (avgWordLength > 5.5) score += 12;
  else score += 5;

  // Structural complexity (0-20)
  if (sentences > 5) score += 10;
  if (hasCode) score += 10;
  if (hasMultipleQuestions) score += 5;

  // Domain complexity (0-25)
  if (hasSpecificTerms) score += 15;
  if (hasNested) score += 10;

  return Math.min(100, Math.max(1, Math.round(score)));
}

/**
 * Map a complexity score to a level label.
 * @param {number} score
 * @returns {string}
 */
function complexityLevel(score) {
  if (score <= 33) return 'LOW';
  if (score <= 66) return 'MEDIUM';
  return 'HIGH';
}

module.exports = { classifyTask, computeComplexity, complexityLevel };
