/**
 * APIforge — Database (SQLite via better-sqlite3)
 * Stores request history locally.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'apiforge.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Initialise schema
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    prompt      TEXT    NOT NULL,
    task        TEXT    NOT NULL,
    complexity  INTEGER NOT NULL,
    level       TEXT    NOT NULL,
    model_id    TEXT    NOT NULL,
    model_name  TEXT    NOT NULL,
    candidates  INTEGER NOT NULL,
    factors     TEXT    NOT NULL,
    response    TEXT    NOT NULL,
    latency_ms  INTEGER NOT NULL,
    is_fallback INTEGER NOT NULL DEFAULT 0,
    fallback_reason TEXT
  );
`);

/**
 * Insert a completed request record.
 */
function insertRequest(record) {
  const stmt = db.prepare(`
    INSERT INTO requests
      (prompt, task, complexity, level, model_id, model_name, candidates, factors, response, latency_ms, is_fallback, fallback_reason)
    VALUES
      (@prompt, @task, @complexity, @level, @model_id, @model_name, @candidates, @factors, @response, @latency_ms, @is_fallback, @fallback_reason)
  `);
  const result = stmt.run({
    ...record,
    factors: JSON.stringify(record.factors),
    is_fallback: record.is_fallback ? 1 : 0,
    fallback_reason: record.fallback_reason || null,
  });
  return result.lastInsertRowid;
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

function parseRecord(row) {
  try {
    row.factors = JSON.parse(row.factors);
  } catch {
    row.factors = [];
  }
  row.is_fallback = !!row.is_fallback;
  return row;
}

module.exports = { insertRequest, getHistory, getRequest, getStats };
