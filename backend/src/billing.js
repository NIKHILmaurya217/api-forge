/**
 * APIforge — Billing / Pricing Engine
 *
 * Computes the credit cost for each request based on:
 *   1. Complexity level (base cost)
 *   2. Token usage (per-token cost)
 *
 * Credits are a virtual currency starting at INITIAL_BALANCE.
 * 1 credit ≈ $0.001 USD (for simulation purposes).
 *
 * Pricing table:
 *   LOW    base:  2 credits
 *   MEDIUM base:  6 credits
 *   HIGH   base: 15 credits
 *
 *   + 0.5 credits per 1,000 input tokens
 *   + 1.0 credits per 1,000 output tokens
 *
 * Token estimates (when real usage is unavailable):
 *   Input  ≈ prompt word count × 1.33
 *   Output ≈ response word count × 1.33
 */

const INITIAL_BALANCE = 200; // credits

const BASE_COST = {
  LOW:    2,
  MEDIUM: 6,
  HIGH:   15,
};

const INPUT_COST_PER_1K  = 0.5;  // credits
const OUTPUT_COST_PER_1K = 1.0;  // credits

/**
 * Estimate token count from a text string.
 * Approximation: words × 1.33 (standard GPT estimate).
 */
function estimateTokens(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.33);
}

/**
 * Compute the cost for a single request.
 *
 * @param {object} params
 * @param {string} params.level        - LOW | MEDIUM | HIGH
 * @param {string} params.prompt       - original prompt text
 * @param {string} params.response     - model response text
 * @param {object} [params.usage]      - optional { prompt_tokens, completion_tokens } from API
 *
 * @returns {{ total: number, breakdown: object }}
 */
function computeCost({ level, prompt, response, usage }) {
  const baseCost = BASE_COST[level] || BASE_COST.LOW;

  // Use real token counts if available, otherwise estimate
  const inputTokens  = usage?.prompt_tokens     || estimateTokens(prompt);
  const outputTokens = usage?.completion_tokens  || estimateTokens(response);

  const inputCost  = (inputTokens  / 1000) * INPUT_COST_PER_1K;
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;

  const total = Math.round((baseCost + inputCost + outputCost) * 100) / 100;

  return {
    total,
    breakdown: {
      baseCost,
      inputTokens,
      outputTokens,
      inputCost:  Math.round(inputCost  * 1000) / 1000,
      outputCost: Math.round(outputCost * 1000) / 1000,
    },
  };
}

module.exports = { computeCost, INITIAL_BALANCE, BASE_COST, INPUT_COST_PER_1K, OUTPUT_COST_PER_1K };
