/**
 * APIforge — OpenRouter API client
 */

const fetch = require('node-fetch');

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

function getHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/apiforge-college-project',
    'X-Title': 'APIforge',
  };
}

/**
 * Fetch free models from OpenRouter.
 * Returns models where pricing is :free or id ends with :free.
 */
async function fetchFreeModels(apiKey) {
  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: getHeaders(apiKey),
  });
  if (!res.ok) throw new Error(`OpenRouter /models failed: ${res.status} ${res.statusText}`);
  const data = await res.json();

  const models = (data.data || []).filter(m => {
    // Free models: pricing prompt/completion = "0" or model id contains :free
    const isFreeId = m.id.endsWith(':free');
    const isFreePrice =
      m.pricing &&
      (m.pricing.prompt === '0' || m.pricing.prompt === 0) &&
      (m.pricing.completion === '0' || m.pricing.completion === 0);
    return (isFreeId || isFreePrice) && !m.id.includes('google') && !m.id.includes('gemma');
  });

  return models.map(m => ({
    id: m.id,
    name: m.name || m.id,
    context_length: m.context_length || 4096,
    description: m.description || '',
    top_provider: m.top_provider || {},
    pricing: m.pricing || {},
    architecture: m.architecture || {},
  }));
}

/**
 * Send a chat completion to a specific model.
 * Returns { content, usage } or throws.
 */
async function chatCompletion(apiKey, modelId, prompt) {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter completion failed [${res.status}]: ${errText}`);
  }

  const data = await res.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('OpenRouter returned no choices');
  }

  return {
    content: data.choices[0].message?.content || '',
    usage: data.usage || {},
    model: data.model || modelId,
  };
}

module.exports = { fetchFreeModels, chatCompletion };
