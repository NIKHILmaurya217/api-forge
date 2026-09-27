/**
 * APIforge — Model Router
 *
 * Scores and selects the most appropriate free model from OpenRouter
 * based on task type and complexity.
 *
 * Scoring criteria:
 *   1. Task compatibility  — does the model support this task type?
 *   2. Complexity fit      — is context large enough for complex requests?
 *   3. Context capacity    — absolute context window in tokens
 *   4. Free availability   — model must be free on OpenRouter
 */

// Task → which model families handle it well
const TASK_AFFINITIES = {
  CODING:   ['deepseek', 'qwen', 'codestral', 'code', 'mistral', 'llama'],
  MATH:     ['deepseek', 'qwen', 'mistral', 'llama', 'gemma'],
  WRITING:  ['llama', 'gemma', 'mistral', 'qwen', 'claude', 'gemini'],
  ANALYSIS: ['llama', 'gemma', 'mistral', 'qwen', 'deepseek'],
  GENERAL:  ['llama', 'gemma', 'mistral', 'qwen', 'deepseek'],
};

/**
 * Score a model against task/complexity criteria.
 * Returns a score object with breakdown.
 *
 * @param {object} model  - { id, name, context_length }
 * @param {string} task   - classified task type
 * @param {number} complexity - 0–100
 * @returns {{ total: number, breakdown: object }}
 */
function scoreModel(model, task, complexity) {
  const modelId = (model.id || '').toLowerCase();
  const contextLength = model.context_length || 4096;

  // 1. Task compatibility (0–40 pts)
  const affinities = TASK_AFFINITIES[task] || TASK_AFFINITIES.GENERAL;
  const taskScore = affinities.some(kw => modelId.includes(kw)) ? 40 : 10;

  // 2. Context capacity (0–30 pts)
  let contextScore = 0;
  if (contextLength >= 128000) contextScore = 30;
  else if (contextLength >= 32000) contextScore = 25;
  else if (contextLength >= 16000) contextScore = 18;
  else if (contextLength >= 8000)  contextScore = 12;
  else contextScore = 5;

  // 3. Complexity fit (0–30 pts)
  // High complexity needs large context. Penalise small models for hard prompts.
  let complexityScore = 0;
  if (complexity >= 67) {
    // HIGH — need at least 32k
    complexityScore = contextLength >= 32000 ? 30 : contextLength >= 8000 ? 15 : 5;
  } else if (complexity >= 34) {
    // MEDIUM — 8k is fine
    complexityScore = contextLength >= 8000 ? 25 : 15;
  } else {
    // LOW — anything works
    complexityScore = 20;
  }

  const total = taskScore + contextScore + complexityScore;

  return {
    total,
    breakdown: {
      taskCompatibility: taskScore,
      contextCapacity: contextScore,
      complexityFit: complexityScore,
    },
  };
}

/**
 * Select the best model from a list of free models.
 *
 * @param {object[]} models  - free models from OpenRouter
 * @param {string}   task
 * @param {number}   complexity
 * @returns {{ selected: object, scored: object[], factors: string[] }}
 */
function selectModel(models, task, complexity) {
  if (!models || models.length === 0) {
    throw new Error('No candidate models available.');
  }

  const scored = models.map(m => ({
    ...m,
    score: scoreModel(m, task, complexity),
  }));

  scored.sort((a, b) => b.score.total - a.score.total);

  const selected = scored[0];
  const breakdown = selected.score.breakdown;

  // Human-readable selection factors
  const factors = [];
  if (breakdown.taskCompatibility >= 30) {
    factors.push(`Strong ${task.toLowerCase()} task compatibility`);
  } else {
    factors.push('General task capability');
  }
  if (breakdown.contextCapacity >= 25) {
    factors.push(`Large context window (${formatContext(selected.context_length)})`);
  } else {
    factors.push(`Adequate context window (${formatContext(selected.context_length)})`);
  }
  if (breakdown.complexityFit >= 25) {
    factors.push('Well-suited for this complexity level');
  } else if (breakdown.complexityFit >= 15) {
    factors.push('Acceptable for this complexity level');
  } else {
    factors.push('Limited fit for high complexity');
  }
  factors.push('Available as a free model on OpenRouter');

  return {
    selected: selected,
    scored: scored,
    candidateCount: models.length,
    factors,
  };
}

function formatContext(tokens) {
  if (!tokens) return 'unknown';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return `${tokens}`;
}

module.exports = { scoreModel, selectModel, formatContext };
