// backend/routes/user.js
const express = require('express');
const { db } = require('../config/database');
const { verifyToken } = require('./auth');

const router = express.Router();

/* GET profile */
router.get('/profile', verifyToken, (req, res) => {
  db.get('SELECT id, nickname, email, path, ai_personality, mood_score, anonymous_mode, offline_mode, store_chat, total_points, level, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  });
});

/* Update basic user fields */
router.patch('/profile', verifyToken, (req, res) => {
  const updates = [];
  const params = [];
  ['nickname', 'path', 'ai_personality', 'offline_mode', 'store_chat', 'mood_score'].forEach((f) => {
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

/* Update user by ID (for backwards compatibility with dashboard) */
router.patch('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  
  // Security check: user can only update their own profile
  if (parseInt(id) !== req.userId) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
  }
  
  const updates = [];
  const params = [];
  ['nickname', 'path', 'ai_personality', 'offline_mode', 'store_chat', 'mood_score'].forEach((f) => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
  params.push(id);
  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Update failed' });
    res.json({ success: true });
  });
});

/* Get user points and level */
router.get('/points', verifyToken, (req, res) => {
  db.get('SELECT total_points, level FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Get points history
    db.all('SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.userId], (err, history) => {
      if (err) return res.status(500).json({ success: false, message: 'Error fetching points history' });
      res.json({ 
        success: true, 
        total_points: user.total_points || 0,
        level: user.level || 1,
        history: history || []
      });
    });
  });
});

/**
 * Award points to a user
 * @param {number} userId - The user ID
 * @param {number} points - Points to award
 * @param {string} reason - Reason for awarding points
 * @returns {Promise}
 */
function awardPoints(userId, points, reason) {
  return new Promise((resolve, reject) => {
    // Insert into points history
    db.run(
      'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)',
      [userId, points, reason],
      function(err) {
        if (err) {
          console.error('Error inserting points history:', err);
          return reject(err);
        }
        
        // Update user's total points and check for level up
        db.get('SELECT total_points, level FROM users WHERE id = ?', [userId], (err, user) => {
          if (err) return reject(err);
          
          const newTotal = (user?.total_points || 0) + points;
          const newLevel = calculateLevel(newTotal);
          
          db.run(
            'UPDATE users SET total_points = ?, level = ? WHERE id = ?',
            [newTotal, newLevel, userId],
            function(err) {
              if (err) return reject(err);
              resolve({ total_points: newTotal, level: newLevel, levelUp: newLevel > (user?.level || 1) });
            }
          );
        });
      }
    );
  });
}

/**
 * Calculate user level based on total points
 * @param {number} totalPoints - User's total points
 * @returns {number} - User's level
 */
function calculateLevel(totalPoints) {
  // Level thresholds: 0-99 = Level 1, 100-299 = Level 2, 300-599 = Level 3, etc.
  if (totalPoints < 100) return 1;
  if (totalPoints < 300) return 2;
  if (totalPoints < 600) return 3;
  if (totalPoints < 1000) return 4;
  if (totalPoints < 1500) return 5;
  if (totalPoints < 2200) return 6;
  if (totalPoints < 3000) return 7;
  if (totalPoints < 4000) return 8;
  if (totalPoints < 5500) return 9;
  return 10;
}

module.exports = router;
module.exports.awardPoints = awardPoints;
