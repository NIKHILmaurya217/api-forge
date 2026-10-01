require('dotenv').config();
const fetch = require('node-fetch');

const BASE = 'http://localhost:4000/api';
const USER = { username: 'diagtest', password: 'diag1234' };

async function run() {
  // 1. Register (ignore if already exists)
  await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(USER),
  }).catch(() => {});

  // 2. Login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(USER),
  });
  const login = await loginRes.json();
  const token = login.token;
  if (!token) { console.error('❌ Login failed:', login); process.exit(1); }
  console.log('✅ Logged in');

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // 3. Send query
  console.log('\n📤 Sending prompt...');
  const t0 = Date.now();
  const qRes = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: 'write a hello world function in python' }),
  });
  const q = await qRes.json();
  console.log(`⏱  Took ${Date.now() - t0}ms`);

  if (q.error) {
    console.error('❌ Query error:', q.error);
  } else {
    console.log('✅ task:', q.task);
    console.log('✅ model:', q.selectedModel?.id);
    console.log('✅ response snippet:', (q.response || '').slice(0, 120));
  }
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
