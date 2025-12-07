// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbAdapter = require('../config/dbAdapter');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { console.error('Missing JWT_SECRET'); process.exit(1); })() : 'dev-secret');

/* Register */
router.post('/register', async (req, res) => {
  try {
    const { nickname, email, password, path, ai_personality, anonymous_mode = false, language = 'en' } = req.body;
    if (!email || !password || !path || !ai_personality) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const sanitized = email.trim().toLowerCase();
    
    // Hash password
    const hash = await new Promise((resolve, reject) => {
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });

    // Prepare user data
    const userData = {
      nickname: nickname || null,
      email: sanitized,
      password_hash: hash,
      path: path,
      ai_personality: ai_personality,
      anonymous_mode: anonymous_mode,
      language: language || 'en'
    };

    // Insert user
    const result = await dbAdapter.insert('users', userData);
    const userId = result.row?.id || result.lastID;

    // Generate token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    // Get user without password
    const user = result.row || await dbAdapter.get('users', { id: userId });
    const { password_hash, ...safeUser } = user;

    res.json({ success: true, token, user: safeUser });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505' || error.message?.includes('UNIQUE') || error.message?.includes('duplicate')) {
      return res.status(400).json({ success: false, message: 'Email already used' });
    }
    return res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
  }
});

/* Login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const sanitized = email.trim().toLowerCase();
    const user = await dbAdapter.get('users', { email: sanitized });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Compare password
    const match = await new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password_hash, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed: ' + error.message });
  }
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
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await dbAdapter.get('users', { id: req.userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving profile: ' + error.message });
  }
});

/* Verify token endpoint */
router.get('/verify', verifyToken, (req, res) => {
  res.json({ success: true, userId: req.userId });
});

module.exports = router;
module.exports.verifyToken = verifyToken;
