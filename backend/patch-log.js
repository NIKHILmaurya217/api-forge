const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server.js');
let s = fs.readFileSync(file, 'utf8');

// 1. Add morgan require
s = s.replace(
  "const { requireAuth, handleRegister, handleLogin, handleMe } = require('./src/auth');",
  "const { requireAuth, handleRegister, handleLogin, handleMe } = require('./src/auth');\nconst morgan = require('morgan');"
);

// 2. Add morgan + startup banner after app.use(express.json())
const oldMiddleware = "// ── Auth Routes (public)";
const newMiddleware = `// ── Logging ──────────────────────────────────────────────────────────────────
morgan.token('body-prompt', (req) => {
  if (req.body && req.body.prompt) {
    const p = req.body.prompt;
    return p.length > 60 ? p.slice(0, 57) + '...' : p;
  }
  return '';
});

const LOG_FMT = ':method :url :status :response-time ms - :res[content-length]b :body-prompt';
app.use(morgan(LOG_FMT, {
  stream: {
    write: (msg) => process.stdout.write('  \u2502 ' + msg),
  }
}));

// ── Auth Routes (public)`;

s = s.replace(oldMiddleware, newMiddleware);

// 3. Replace the boring startup message with a rich banner
s = s.replace(
  `app.listen(PORT, () => {
  console.log(\`APIforge backend running on http://localhost:\${PORT}\`);
  if (!API_KEY || API_KEY === 'your_openrouter_api_key_here') {
    console.warn('\u26a0\ufe0f  OPENROUTER_API_KEY is not set. Edit backend/.env before making requests.');
  }
});`,
  `app.listen(PORT, () => {
  const hr = '\u2500'.repeat(52);
  console.log('');
  console.log('  \u250c' + hr + '\u2510');
  console.log('  \u2502  \u26a1 APIforge Backend                                    \u2502');
  console.log('  \u2502  \u25cf  http://localhost:' + PORT + '                              \u2502');
  console.log('  \u2502  \u2022  Auth   : POST /api/auth/register | /api/auth/login  \u2502');
  console.log('  \u2502  \u2022  Query  : POST /api/query                            \u2502');
  console.log('  \u2502  \u2022  Stats  : GET  /api/stats                            \u2502');
  console.log('  \u2514' + hr + '\u2518');
  console.log('');
  if (!API_KEY || API_KEY === 'your_openrouter_api_key_here') {
    console.warn('  \u26a0  OPENROUTER_API_KEY not set! Edit backend/.env');
  } else {
    console.log('  \u2713 OpenRouter API key loaded');
  }
  console.log('  \u2713 SQLite database ready');
  console.log('  \u2713 Auth (JWT) enabled');
  console.log('');
  console.log('  Listening for requests...');
  console.log('  ' + '\u2500'.repeat(52));
});`
);

fs.writeFileSync(file, s, 'utf8');
console.log('server.js patched with logging');
