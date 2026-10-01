require('dotenv').config();
const fetch = require('node-fetch');

const KEY = process.env.OPENROUTER_API_KEY;
const BASE = 'https://openrouter.ai/api/v1';

// Test ONE prompt, ONE model, log everything raw
async function debug(modelId, prompt) {
  console.log(`\nModel: ${modelId}`);
  console.log(`Prompt: "${prompt}"`);

  const body = {
    model: modelId,
    messages: [{ role: 'user', content: `Classify into one word — CODING, MATH, WRITING, ANALYSIS, or GENERAL:\n"${prompt}"\nAnswer:` }],
    max_tokens: 10,
    temperature: 0.3,
  };

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeout: 10000,
  });

  console.log('HTTP status:', res.status);
  const raw = await res.text();
  console.log('Raw response:', raw.slice(0, 500));

  try {
    const d = JSON.parse(raw);
    const choice = d.choices?.[0];
    console.log('finish_reason:', choice?.finish_reason);
    console.log('content:', JSON.stringify(choice?.message?.content));
    console.log('usage:', JSON.stringify(d.usage));
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

(async () => {
  await debug('liquid/lfm-2.5-2.6b:free', 'fix my Python binary search bug');
  await debug('inclusionai/ling-3.0-flash-sante:free', 'write a blog post');
  process.exit(0);
})();
