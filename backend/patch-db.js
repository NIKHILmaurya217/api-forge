const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'src', 'db.js');
let content = fs.readFileSync(dbPath, 'utf8');

// Remove any previously appended user block (to be safe)
const marker = '\n\n// ─── Users ';
const idx = content.indexOf(marker);
if (idx !== -1) content = content.slice(0, idx);

// Append clean user functions
const userBlock = `

// ─── Users ───────────────────────────────────────────────────────────────────

db.exec(
  'CREATE TABLE IF NOT EXISTS users (' +
  '  id            INTEGER PRIMARY KEY AUTOINCREMENT,' +
  '  created_at    TEXT    NOT NULL DEFAULT (datetime(\\'now\\')),' +
  '  username      TEXT    NOT NULL UNIQUE,' +
  '  password_hash TEXT    NOT NULL' +
  ');'
);

function createUser(username, passwordHash) {
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  const info = stmt.run(username, passwordHash);
  return info.lastInsertRowid;
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
}

// Merge user functions into exports
const _orig = module.exports;
module.exports = Object.assign({}, _orig, { createUser, getUserByUsername });
`;

fs.writeFileSync(dbPath, content + userBlock, 'utf8');
console.log('db.js patched OK');
