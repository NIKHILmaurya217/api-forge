/**
 * APIforge - Authentication Module
 * Handles user registration, login, and JWT verification.
 */
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcryptjs');
const db        = require('./db');

const JWT_SECRET  = process.env.JWT_SECRET || 'apiforge-secret-change-me-in-prod';
const JWT_EXPIRES = '7d';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateToken(userId, username) {
  return jwt.sign({ sub: userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

function handleRegister(req, res) {
  const { username, password } = req.body || {};

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const clean = username.trim().toLowerCase();

  // Check duplicate
  const existing = db.getUserByUsername(clean);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken.' });
  }

  const hash   = bcrypt.hashSync(password, 10);
  const userId = db.createUser(clean, hash);
  const token  = generateToken(userId, clean);

  res.status(201).json({ token, user: { id: userId, username: clean } });
}

function handleLogin(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const clean = username.trim().toLowerCase();
  const user  = db.getUserByUsername(clean);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = generateToken(user.id, user.username);
  res.json({ token, user: { id: user.id, username: user.username } });
}

function handleMe(req, res) {
  res.json({ id: req.user.id, username: req.user.username });
}

module.exports = { requireAuth, handleRegister, handleLogin, handleMe };
