require('dotenv').config();
const c = require('./src/classifier');

const tests = [
  'write me a blog post about climate change',
  'fix this Python bug in my binary search function',
  'calculate the integral of x squared from 0 to 5',
  'compare the pros and cons of React vs Vue',
  'what is the weather like today',
  'implement a REST API with Express and JWT auth',
  'explain the difference between TCP and UDP',
];

console.log('Using ML model: google/gemma-3-1b-it:free via OpenRouter\n');

(async () => {
  for (const prompt of tests) {
    const task  = await c.classifyTask(prompt);
    const score = c.computeComplexity(prompt);
    const level = c.complexityLevel(score);
    const tag   = task === classifyRegex(prompt) ? '✓' : '~';
    console.log(`[${task.padEnd(8)}] [${level.padEnd(6)}] ${tag}  ${prompt.slice(0, 58)}`);
  }
  console.log('\nDone. (✓ = matches regex baseline, ~ = ML differs)');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

// quick inline regex for comparison
function classifyRegex(prompt) {
  const pats = {
    CODING:   /\b(code|function|bug|fix|debug|implement|algorithm|program|script|class|method|api|endpoint|sql|query|regex|compile|syntax|error|exception|typescript|javascript|python|java|c\+\+|rust|golang|react|node|express)\b/i,
    MATH:     /\b(calculate|solve|equation|integral|derivative|matrix|probability|statistics|algebra|geometry|theorem|proof|formula|compute|sum|product|factor|prime|optimization|linear|differential)\b/i,
    WRITING:  /\b(write|essay|paragraph|summarize|paraphrase|rewrite|draft|article|blog|email|letter|grammar|punctuation|proofread|narrative|story|poem|creative|copy|content|headline|thesis)\b/i,
    ANALYSIS: /\b(analyze|compare|evaluate|assess|explain|why|how does|what is the difference|pros and cons|advantages|disadvantages|review|critique|interpret|examine|investigate|study)\b/i,
  };
  for (const [t, re] of Object.entries(pats)) if (re.test(prompt)) return t;
  return 'GENERAL';
}
