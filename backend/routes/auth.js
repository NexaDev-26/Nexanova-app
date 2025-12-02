// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { console.error('Missing JWT_SECRET'); process.exit(1); })() : 'dev-secret');

/* Register */
router.post('/register', async (req, res) => {
  const { nickname, email, password, path, ai_personality, anonymous_mode = false } = req.body;
  if (!email || !password || !path || !ai_personality) return res.status(400).json({ success: false, message: 'Missing required fields' });

  const sanitized = email.trim().toLowerCase();
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ success: false, message: 'Hash error' });

    const stmt = `INSERT INTO users (nickname, email, password_hash, path, ai_personality, anonymous_mode) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(stmt, [nickname || null, sanitized, hash, path, ai_personality, anonymous_mode ? 1 : 0], function(insertErr) {
      if (insertErr) {
        if (insertErr.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Email already used' });
        return res.status(500).json({ success: false, message: 'DB insert error' });
      }
      const userId = this.lastID;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
      db.get('SELECT id, nickname, email, path, ai_personality, anonymous_mode, mood_score, created_at FROM users WHERE id = ?', [userId], (e, row) => {
        if (e) return res.status(500).json({ success: false, message: 'Error retrieving user' });
        res.json({ success: true, token, user: row });
      });
    });
  });
});

/* Login */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  const sanitized = email.trim().toLowerCase();
  db.get('SELECT * FROM users WHERE email = ?', [sanitized], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    bcrypt.compare(password, user.password_hash, (cmpErr, match) => {
      if (cmpErr || !match) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      const { password_hash, ...safeUser } = user;
      res.json({ success: true, token, user: safeUser });
    });
  });
});

/* token verification helper exported for other routes */
const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

/* Get current user profile (for token verification) */
router.get('/profile', verifyToken, (req, res) => {
  db.get(
    'SELECT id, nickname, email, path, ai_personality, mood_score, anonymous_mode, offline_mode, store_chat, total_points, level, created_at FROM users WHERE id = ?',
    [req.userId],
    (err, user) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, user });
    }
  );
});

/* Verify token endpoint */
router.get('/verify', verifyToken, (req, res) => {
  res.json({ success: true, userId: req.userId });
});

module.exports = router;
module.exports.verifyToken = verifyToken;
