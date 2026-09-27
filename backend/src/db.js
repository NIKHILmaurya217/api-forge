/**
 * APIforge — Database (SQLite via better-sqlite3)
 * Stores request history and billing data locally.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'apiforge.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

const { INITIAL_BALANCE } = require('./billing');

// Initialise schema
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    prompt          TEXT    NOT NULL,
    task            TEXT    NOT NULL,
    complexity      INTEGER NOT NULL,
    level           TEXT    NOT NULL,
    model_id        TEXT    NOT NULL,
    model_name      TEXT    NOT NULL,
    candidates      INTEGER NOT NULL,
    factors         TEXT    NOT NULL,
    response        TEXT    NOT NULL,
    latency_ms      INTEGER NOT NULL,
    is_fallback     INTEGER NOT NULL DEFAULT 0,
    fallback_reason TEXT,
    cost            REAL    NOT NULL DEFAULT 0,
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS wallet (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    balance     REAL    NOT NULL DEFAULT 200,
    total_spent REAL    NOT NULL DEFAULT 0,
    top_ups     REAL    NOT NULL DEFAULT 0,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    type        TEXT    NOT NULL,
    amount      REAL    NOT NULL,
    description TEXT    NOT NULL,
    balance_after REAL  NOT NULL,
    request_id  INTEGER
  );
`);

// Migrate existing requests table — add billing columns if they are missing
const _cols = db.pragma('table_info(requests)').map(c => c.name);
if (!_cols.includes('cost'))          db.exec('ALTER TABLE requests ADD COLUMN cost          REAL    NOT NULL DEFAULT 0');
if (!_cols.includes('input_tokens'))  db.exec('ALTER TABLE requests ADD COLUMN input_tokens  INTEGER NOT NULL DEFAULT 0');
if (!_cols.includes('output_tokens')) db.exec('ALTER TABLE requests ADD COLUMN output_tokens INTEGER NOT NULL DEFAULT 0');

// Seed wallet row if missing
const walletExists = db.prepare('SELECT id FROM wallet WHERE id = 1').get();
if (!walletExists) {
  db.prepare('INSERT INTO wallet (id, balance, total_spent, top_ups) VALUES (1, ?, 0, 0)').run(INITIAL_BALANCE);
  db.prepare(`
    INSERT INTO transactions (type, amount, description, balance_after, request_id)
    VALUES ('TOP_UP', ?, 'Initial credit grant', ?, NULL)
  `).run(INITIAL_BALANCE, INITIAL_BALANCE);
}

/**
 * Insert a completed request record and deduct credits from wallet.
 * Returns { requestId, newBalance, cost }
 */
function insertRequest(record) {
  const insertReq = db.prepare(`
    INSERT INTO requests
      (prompt, task, complexity, level, model_id, model_name, candidates, factors, response,
       latency_ms, is_fallback, fallback_reason, cost, input_tokens, output_tokens)
    VALUES
      (@prompt, @task, @complexity, @level, @model_id, @model_name, @candidates, @factors, @response,
       @latency_ms, @is_fallback, @fallback_reason, @cost, @input_tokens, @output_tokens)
  `);

  const deductWallet = db.prepare(`
    UPDATE wallet
    SET balance     = balance - ?,
        total_spent = total_spent + ?,
        updated_at  = datetime('now')
    WHERE id = 1
  `);

  const insertTx = db.prepare(`
    INSERT INTO transactions (type, amount, description, balance_after, request_id)
    VALUES ('CHARGE', ?, ?, (SELECT balance FROM wallet WHERE id = 1), ?)
  `);

  const cost   = record.cost || 0;
  const run = db.transaction(() => {
    const result = insertReq.run({
      ...record,
      factors:        JSON.stringify(record.factors),
      is_fallback:    record.is_fallback ? 1 : 0,
      fallback_reason: record.fallback_reason || null,
      cost,
      input_tokens:  record.input_tokens  || 0,
      output_tokens: record.output_tokens || 0,
    });
    const requestId = result.lastInsertRowid;
    deductWallet.run(cost, cost);
    const desc = `${record.task} / ${record.level} — ${record.model_name}`;
    insertTx.run(cost, desc, requestId);
    const wallet = db.prepare('SELECT balance FROM wallet WHERE id = 1').get();
    return { requestId, newBalance: wallet.balance, cost };
  });

  return run();
}

/**
 * Retrieve paginated history, newest first.
 */
function getHistory({ limit = 50, offset = 0 } = {}) {
  return db.prepare(`
    SELECT * FROM requests ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(limit, offset).map(parseRecord);
}

/**
 * Get a single request by id.
 */
function getRequest(id) {
  const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  return row ? parseRecord(row) : null;
}

/**
 * Dashboard stats.
 */
function getStats() {
  const total = db.prepare('SELECT COUNT(*) as n FROM requests').get().n;
  const avgLatency = db.prepare('SELECT AVG(latency_ms) as v FROM requests').get().v;
  const fallbacks = db.prepare('SELECT COUNT(*) as n FROM requests WHERE is_fallback = 1').get().n;

  const taskDist = db.prepare(`
    SELECT task, COUNT(*) as count FROM requests GROUP BY task ORDER BY count DESC
  `).all();

  const modelDist = db.prepare(`
    SELECT model_name, COUNT(*) as count FROM requests GROUP BY model_name ORDER BY count DESC LIMIT 10
  `).all();

  const complexityDist = db.prepare(`
    SELECT level, COUNT(*) as count FROM requests GROUP BY level
  `).all();

  // Activity: last 20 requests for a mini time-series
  const activity = db.prepare(`
    SELECT created_at, latency_ms FROM requests ORDER BY id DESC LIMIT 20
  `).all().reverse();

  return {
    total,
    avgLatency: avgLatency ? Math.round(avgLatency) : null,
    fallbacks,
    taskDist,
    modelDist,
    complexityDist,
    activity,
  };
}

/**
 * Get the current wallet state.
 */
function getWallet() {
  return db.prepare('SELECT * FROM wallet WHERE id = 1').get();
}

/**
 * Top up the wallet by adding credits.
 */
function topUpWallet(amount, note = 'Manual top-up') {
  const wallet = db.prepare('SELECT balance FROM wallet WHERE id = 1').get();
  const newBalance = wallet.balance + amount;
  db.prepare('UPDATE wallet SET balance = ?, top_ups = top_ups + ?, updated_at = datetime(\'now\') WHERE id = 1').run(newBalance, amount);
  db.prepare(`
    INSERT INTO transactions (type, amount, description, balance_after, request_id)
    VALUES ('TOP_UP', ?, ?, ?, NULL)
  `).run(amount, note, newBalance);
  return { balance: newBalance };
}

/**
 * Get billing transactions (newest first).
 */
function getTransactions({ limit = 50, offset = 0 } = {}) {
  return db.prepare(`
    SELECT t.*, r.task, r.level, r.complexity
    FROM transactions t
    LEFT JOIN requests r ON t.request_id = r.id
    ORDER BY t.id DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
}

/**
 * Billing stats for the Billing page.
 */
function getBillingStats() {
  const wallet  = getWallet();
  const byLevel = db.prepare(`
    SELECT level, COUNT(*) as count, SUM(cost) as total_cost, AVG(cost) as avg_cost
    FROM requests GROUP BY level
  `).all();
  const byTask  = db.prepare(`
    SELECT task, COUNT(*) as count, SUM(cost) as total_cost
    FROM requests GROUP BY task ORDER BY total_cost DESC
  `).all();
  const dailyCost = db.prepare(`
    SELECT date(created_at) as day, SUM(cost) as total, COUNT(*) as requests
    FROM requests GROUP BY day ORDER BY day DESC LIMIT 14
  `).all().reverse();
  const topModels = db.prepare(`
    SELECT model_name, COUNT(*) as count, SUM(cost) as total_cost, AVG(cost) as avg_cost
    FROM requests GROUP BY model_name ORDER BY total_cost DESC LIMIT 8
  `).all();
  const costTimeline = db.prepare(`
    SELECT created_at, cost, level, task
    FROM requests ORDER BY id DESC LIMIT 30
  `).all().reverse();

  return { wallet, byLevel, byTask, dailyCost, topModels, costTimeline };
}

function parseRecord(row) {
  try {
    row.factors = JSON.parse(row.factors);
  } catch {
    row.factors = [];
  }
  row.is_fallback = !!row.is_fallback;
  return row;
}

module.exports = {
  insertRequest, getHistory, getRequest, getStats,
  getWallet, topUpWallet, getTransactions, getBillingStats,
};
