/**
 * APIforge — Task Classifier (ML-powered via OpenRouter LLM)
 *
 * Classifies a prompt into a task type using a lightweight free LLM
 * on OpenRouter (google/gemma-3-1b-it:free). The model is asked to
 * return a single JSON token, keeping latency and token cost minimal.
 *
 * Falls back to the original regex classifier if:
 *   - OPENROUTER_API_KEY is not set
 *   - The API call fails or times out (8 s)
 *   - The model returns an unexpected response
 */

const fetch = require('node-fetch');

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Free models tried in order — first one to succeed wins
// liquid/lfm-2.5-2.6b:free is smallest and fastest (2.6B params)
const CLASSIFIER_MODELS = [
  'liquid/lfm-2.5-2.6b:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3.8-27b:free',
];

const VALID_TASKS = new Set(['CODING', 'MATH', 'WRITING', 'ANALYSIS', 'GENERAL']);

// ── LLM classifier ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a task classifier. Given a user prompt, classify it into exactly one of these categories:
- CODING   : programming, debugging, code generation, scripts, APIs, databases
- MATH     : calculations, equations, proofs, statistics, geometry, algorithms
- WRITING  : essays, articles, emails, stories, proofreading, summarization
- ANALYSIS : comparisons, explanations, evaluations, research, pros/cons
- GENERAL  : anything else

Respond with ONLY a single JSON object in this exact format, no other text:
{"task":"CATEGORY"}`;

/**
 * Classify prompt via OpenRouter LLM.
 * @param {string} prompt
 * @param {string} apiKey
 * @returns {Promise<string|null>} task type or null on failure
 */
async function classifyTaskML(prompt, apiKey) {
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') return null;

  // Try each model in order until one succeeds
  for (const model of CLASSIFIER_MODELS) {
    const result = await tryModel(prompt, apiKey, model);
    if (result !== null) return result;
  }
  return null;
}

async function tryModel(prompt, apiKey, model) {

  try {
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/apiforge-college-project',
        'X-Title': 'APIforge',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt.slice(0, 500) }, // cap at 500 chars
        ],
        max_tokens: 30,        // only need {"task":"CODING"}
        temperature: 0.1,      // slight randomness prevents empty completions
      }),
      timeout: 8000,
    });

    if (!res.ok) {
      const errBody = await res.text();
      // 429 = rate limit, try next model silently
      if (res.status !== 429) {
        console.warn(`  ⚠  ML classifier [${model}]: ${res.status}: ${errBody.slice(0, 120)}`);
      }
      return null;
    }

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '').trim();

    // Extract the JSON — be lenient about surrounding whitespace / markdown
    const match = raw.match(/\{[^}]*"task"\s*:\s*"([A-Z]+)"[^}]*\}/);
    if (!match) {
      // Empty or malformed — try next model
      return null;
    }

    const task = match[1].toUpperCase();
    return VALID_TASKS.has(task) ? task : 'GENERAL';
  } catch (err) {
    // timeout or network error — try next model silently
    return null;
  }
}

// ── Regex fallback ────────────────────────────────────────────────────────────

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

function classifyTaskRegex(prompt) {
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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Classify the task type from a prompt string.
 * Tries LLM classification first, falls back to regex if unavailable.
 *
 * @param {string} prompt
 * @param {string} [apiKey]  OpenRouter API key (defaults to env var)
 * @returns {Promise<string>} task type: CODING | MATH | WRITING | ANALYSIS | GENERAL
 */
async function classifyTask(prompt, apiKey) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  const mlResult = await classifyTaskML(prompt, key);
  if (mlResult !== null) return mlResult;
  return classifyTaskRegex(prompt);
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
