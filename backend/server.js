/**
 * APIforge — Express Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { classifyTask, computeComplexity, complexityLevel } = require('./src/classifier');
const { selectModel } = require('./src/router');
const { fetchFreeModels, chatCompletion } = require('./src/openrouter');
const { computeCost } = require('./src/billing');
const db = require('./src/db');

const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.OPENROUTER_API_KEY;

app.use(cors());
app.use(express.json());

// In-memory model cache (refreshed every 10 minutes)
let modelCache = [];
let modelCacheAt = 0;
const CACHE_TTL = 10 * 60 * 1000;

async function getModels() {
  if (Date.now() - modelCacheAt > CACHE_TTL || modelCache.length === 0) {
    modelCache = await fetchFreeModels(API_KEY);
    modelCacheAt = Date.now();
  }
  return modelCache;
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/query
 * Main endpoint: classify → route → call → store → respond
 */
app.post('/api/query', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  if (!API_KEY || API_KEY === 'your_openrouter_api_key_here') {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured in backend/.env' });
  }

  const startAt = Date.now();

  try {
    // 1. Classify
    const task = classifyTask(prompt);
    const complexity = computeComplexity(prompt);
    const level = complexityLevel(complexity);

    // 2. Fetch free models and route
    const models = await getModels();
    const routing = selectModel(models, task, complexity);

    let responseContent = '';
    let actualModel = routing.selected.id;
    let isFallback = false;
    let fallbackReason = null;

    // 3. Try selected model, then try next best as fallback
    const toTry = routing.scored.slice(0, 3);
    let lastError = null;

    for (let i = 0; i < toTry.length; i++) {
      try {
        const result = await chatCompletion(API_KEY, toTry[i].id, prompt);
        responseContent = result.content;
        actualModel = toTry[i].id;
        if (i > 0) {
          isFallback = true;
          fallbackReason = `Primary model (${toTry[0].name || toTry[0].id}) unavailable: ${lastError?.message || 'error'}`;
        }
        break;
      } catch (err) {
        lastError = err;
        if (i === toTry.length - 1) throw err;
      }
    }

    const latencyMs = Date.now() - startAt;
    const selectedModelObj = models.find(m => m.id === actualModel) || routing.selected;

    // 4. Compute cost
    const billing = computeCost({
      level,
      prompt: prompt.trim(),
      response: responseContent,
    });

    // 5. Store in database (also deducts credits atomically)
    const { requestId, newBalance, cost } = db.insertRequest({
      prompt: prompt.trim(),
      task,
      complexity,
      level,
      model_id: actualModel,
      model_name: selectedModelObj.name || actualModel,
      candidates: routing.candidateCount,
      factors: routing.factors,
      response: responseContent,
      latency_ms: latencyMs,
      is_fallback: isFallback,
      fallback_reason: fallbackReason,
      cost: billing.total,
      input_tokens: billing.breakdown.inputTokens,
      output_tokens: billing.breakdown.outputTokens,
    });

    res.json({
      id: requestId,
      task,
      complexity,
      level,
      candidates: routing.candidateCount,
      selectedModel: {
        id: actualModel,
        name: selectedModelObj.name || actualModel,
        context_length: selectedModelObj.context_length,
      },
      scoredModels: routing.scored.slice(0, 5).map(m => ({
        id: m.id,
        name: m.name,
        score: m.score.total,
      })),
      factors: routing.factors,
      response: responseContent,
      latency_ms: latencyMs,
      is_fallback: isFallback,
      fallback_reason: fallbackReason,
      billing: {
        cost: billing.total,
        breakdown: billing.breakdown,
        new_balance: newBalance,
      },
    });
  } catch (err) {
    console.error('Query error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/models
 * Return free models list from OpenRouter (cached).
 */
app.get('/api/models', async (req, res) => {
  if (!API_KEY || API_KEY === 'your_openrouter_api_key_here') {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured in backend/.env' });
  }
  try {
    const models = await getModels();
    res.json({ models, count: models.length, cached_at: new Date(modelCacheAt).toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/history
 * Return paginated request history.
 */
app.get('/api/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const history = db.getHistory({ limit, offset });
  res.json({ history, limit, offset });
});

/**
 * GET /api/history/:id
 * Return a single request record.
 */
app.get('/api/history/:id', (req, res) => {
  const record = db.getRequest(parseInt(req.params.id));
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

/**
 * GET /api/stats
 * Return dashboard statistics.
 */
app.get('/api/stats', (req, res) => {
  const stats = db.getStats();
  res.json(stats);
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Billing Routes ──────────────────────────────────────────────────────────

/**
 * GET /api/billing
 * Full billing stats: wallet + breakdowns + timeline.
 */
app.get('/api/billing', (req, res) => {
  res.json(db.getBillingStats());
});

/**
 * GET /api/billing/wallet
 * Current wallet balance only.
 */
app.get('/api/billing/wallet', (req, res) => {
  res.json(db.getWallet());
});

/**
 * GET /api/billing/transactions
 * Paginated transaction log.
 */
app.get('/api/billing/transactions', (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  res.json({ transactions: db.getTransactions({ limit, offset }) });
});

/**
 * POST /api/billing/topup
 * Add credits to the wallet (simulation).
 */
app.post('/api/billing/topup', (req, res) => {
  const { amount, note } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000) {
    return res.status(400).json({ error: 'amount must be a positive number ≤ 10000' });
  }
  const result = db.topUpWallet(amount, note || 'Manual top-up');
  res.json(result);
});

// ── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`APIforge backend running on http://localhost:${PORT}`);
  if (!API_KEY || API_KEY === 'your_openrouter_api_key_here') {
    console.warn('⚠  OPENROUTER_API_KEY is not set. Edit backend/.env before making requests.');
  }
});
