const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { verifyToken } = require('./auth');
const { awardPoints } = require('./user');
const { invalidateUserCache } = require('../utils/cache');

// Get all journal entries
router.get('/', verifyToken, (req, res) => {
  db.all(
    'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC, created_at DESC',
    [req.userId],
    (err, entries) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching journal entries' });
      }
      res.json({ success: true, entries });
    }
  );
});

// Create journal entry
router.post('/', verifyToken, (req, res) => {
  const { title, content, mood, tags, date } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }

  const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;

  db.run(
    'INSERT INTO journal_entries (user_id, title, content, mood, tags, date) VALUES (?, ?, ?, ?, ?, ?)',
    [req.userId, title || null, content, mood || 5, tagsJson, date || new Date().toISOString().split('T')[0]],
    function(err) {
      if (err) {
        console.error('Error creating journal entry:', err);
        return res.status(500).json({ success: false, message: 'Error creating journal entry' });
      }
      // Award points for journal entry (5 points base, bonus for longer entries)
      const wordCount = content.split(/\s+/).length;
      let points = 5;
      if (wordCount > 100) points += 5;
      if (wordCount > 200) points += 5;
      awardPoints(req.userId, points, 'Journal entry').catch(err => {
        console.error('Error awarding journal points:', err);
      });
      
      // Invalidate user cache
      invalidateUserCache(req.userId);
      
      res.json({ success: true, entry_id: this.lastID });
    }
  );
});

// Update journal entry
router.patch('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { title, content, mood, tags, date } = req.body;

  // Check if entry belongs to user
  db.get('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?', [id, req.userId], (err, entry) => {
    if (err || !entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (mood !== undefined) {
      updates.push('mood = ?');
      values.push(mood);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(tags && tags.length > 0 ? JSON.stringify(tags) : null);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      values.push(date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);

    db.run(
      `UPDATE journal_entries SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      [...values, req.userId],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error updating journal entry' });
        }
        
        // Invalidate user cache
        invalidateUserCache(req.userId);
        
        res.json({ success: true });
      }
    );
  });
});

// Delete journal entry
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM journal_entries WHERE id = ? AND user_id = ?', [id, req.userId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting journal entry' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }
    
    // Invalidate user cache
    invalidateUserCache(req.userId);
    
    res.json({ success: true });
  });
});

// Get journal entry by ID
router.get('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.get(
    'SELECT * FROM journal_entries WHERE id = ? AND user_id = ?',
    [id, req.userId],
    (err, entry) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching journal entry' });
      }
      if (!entry) {
        return res.status(404).json({ success: false, message: 'Journal entry not found' });
      }
      if (entry.tags) {
        entry.tags = JSON.parse(entry.tags);
      }
      res.json({ success: true, entry });
    }
  );
});

module.exports = router;

