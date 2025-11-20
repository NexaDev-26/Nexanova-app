// backend/routes/user.js
const express = require('express');
const { db } = require('../config/database');
const { verifyToken } = require('./auth');

const router = express.Router();

/* GET profile */
router.get('/profile', verifyToken, (req, res) => {
  db.get('SELECT id, nickname, email, path, ai_personality, mood_score, anonymous_mode, offline_mode, store_chat, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  });
});

/* Update basic user fields (example) */
router.patch('/profile', verifyToken, (req, res) => {
  const updates = [];
  const params = [];
  ['nickname', 'path', 'ai_personality', 'offline_mode', 'store_chat'].forEach((f) => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
  params.push(req.userId);
  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Update failed' });
    res.json({ success: true });
  });
});

module.exports = router;
