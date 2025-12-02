const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { verifyToken } = require('./auth');
const { awardPoints } = require('./user');

// Get all habits (optimized query - only select needed columns)
router.get('/', verifyToken, (req, res) => {
  db.all(
    `SELECT id, user_id, title, type, category, difficulty, frequency, reminder_time, 
     description, trigger, replacement, streak, longest_streak, last_completed, 
     total_completions, is_active, target_streak, start_date, created_at, updated_at 
     FROM habits WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC`, 
    [req.userId], 
    (err, habits) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching habits' });
      }
      res.json({ success: true, habits });
    }
  );
});

// Create habit
router.post('/', verifyToken, (req, res) => {
  const { 
    title, 
    type, 
    category, 
    difficulty, 
    frequency, 
    reminder_time, 
    description, 
    trigger, 
    replacement 
  } = req.body;

  // Validate required fields
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Habit title is required' });
  }

  if (!type || !['build', 'break'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Habit type must be "build" or "break"' });
  }

  // Clean and prepare data
  const cleanTitle = title.trim();
  const cleanCategory = (category && category.trim()) ? category.trim() : null;
  const cleanDifficulty = difficulty || 'easy';
  const cleanFrequency = frequency || 'daily';
  const cleanReminderTime = (reminder_time && reminder_time.trim()) ? reminder_time.trim() : null;
  const cleanDescription = (description && description.trim()) ? description.trim() : null;
  const cleanTrigger = (trigger && trigger.trim()) ? trigger.trim() : null;
  const cleanReplacement = (replacement && replacement.trim()) ? replacement.trim() : null;

  // Use quotes for 'trigger' since it's a reserved keyword in SQLite
  // Also include new columns with default values for backward compatibility
  const today = new Date().toISOString().split('T')[0];
  
  db.run(
    `INSERT INTO habits (
      user_id, title, type, category, difficulty, frequency, reminder_time, 
      description, "trigger", replacement, streak, longest_streak, 
      total_completions, is_active, target_streak, start_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.userId, 
      cleanTitle, 
      type, 
      cleanCategory, 
      cleanDifficulty, 
      cleanFrequency, 
      cleanReminderTime, 
      cleanDescription, 
      cleanTrigger, 
      cleanReplacement,
      0, // streak (default)
      0, // longest_streak (default)
      0, // total_completions (default)
      1, // is_active (default true)
      30, // target_streak (default)
      today // start_date
    ],
    function(err) {
      if (err) {
        console.error('❌ Error creating habit:', err);
        console.error('Error details:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        console.error('Habit data:', { 
          title: cleanTitle, 
          type, 
          userId: req.userId,
          category: cleanCategory,
          difficulty: cleanDifficulty
        });
        
        // Provide more specific error message
        let errorMessage = 'Error creating habit';
        if (err.message.includes('FOREIGN KEY')) {
          errorMessage = 'Invalid user ID. Please login again.';
        } else if (err.message.includes('NOT NULL')) {
          errorMessage = 'Missing required fields';
        } else if (err.message.includes('CHECK')) {
          errorMessage = 'Invalid data value provided';
        } else {
          errorMessage = 'Database error: ' + err.message;
        }
        
        return res.status(500).json({ 
          success: false, 
          message: errorMessage,
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
      console.log(`✅ Habit created successfully: ID ${this.lastID}, Title: ${cleanTitle}, User: ${req.userId}`);
      res.json({ 
        success: true, 
        habit_id: this.lastID, 
        message: 'Habit created successfully',
        data: {
          id: this.lastID,
          title: cleanTitle,
          type: type
        }
      });
    }
  );
});

// Update habit completion
router.patch('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { completed_today, notes, trigger, mood } = req.body;
  const today = new Date().toISOString().split('T')[0];

  // Check if habit belongs to user
  db.get('SELECT * FROM habits WHERE id = ? AND user_id = ?', [id, req.userId], (err, habit) => {
    if (err || !habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    // Handle unchecking (removing completion for today)
    if (completed_today === false || completed_today === 0) {
      // Remove today's completion if it exists
      db.run(
        'DELETE FROM habit_completions WHERE habit_id = ? AND completion_date = ?',
        [id, today],
        function(err) {
          if (err) {
            console.error('Error removing completion:', err);
            return res.status(500).json({ success: false, message: 'Error removing completion' });
          }

          // Recalculate streak (if completion was removed, streak might need adjustment)
          // For simplicity, we'll keep the current streak but update last_completed
          let newStreak = habit.streak;
          let newLastCompleted = habit.last_completed;

          // If today was the last completed date, we might need to update it
          if (habit.last_completed === today) {
            // Find the most recent completion date before today
            db.get(
              'SELECT MAX(completion_date) as last_date FROM habit_completions WHERE habit_id = ? AND completion_date < ?',
              [id, today],
              (err, result) => {
                if (!err && result && result.last_date) {
                  newLastCompleted = result.last_date;
                } else {
                  newLastCompleted = null;
                }

                // Update habit
                db.run(
                  'UPDATE habits SET last_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [newLastCompleted, id],
                  (err) => {
                    if (err) {
                      console.error('Error updating habit after unchecking:', err);
                    }
                    res.json({ 
                      success: true, 
                      streak: newStreak,
                      message: 'Completion removed for today'
                    });
                  }
                );
              }
            );
          } else {
            res.json({ 
              success: true, 
              streak: habit.streak,
              message: 'Completion removed for today'
            });
          }
        }
      );
      return;
    }

    if (completed_today) {
      // Check if already completed today
      db.get(
        'SELECT * FROM habit_completions WHERE habit_id = ? AND completion_date = ?',
        [id, today],
        (err, existing) => {
          if (existing) {
            return res.json({ success: true, streak: habit.streak, message: 'Already completed today' });
          }

          // Add completion with enhanced fields
          const completionNotes = notes || (trigger ? `Trigger: ${trigger}. Mood: ${mood || 'N/A'}/10` : null);
          db.run(
            `INSERT INTO habit_completions (habit_id, completion_date, notes, mood, "trigger") 
             VALUES (?, ?, ?, ?, ?)`,
            [id, today, completionNotes, mood || null, trigger || null],
            (err) => {
              if (err) {
                console.error('Error recording completion:', err);
                // If unique constraint error, habit already completed today
                if (err.message.includes('UNIQUE constraint')) {
                  return res.json({ success: true, streak: habit.streak, message: 'Already completed today' });
                }
                return res.status(500).json({ 
                  success: false, 
                  message: 'Error recording completion: ' + err.message 
                });
              }

              // Update streak
              const lastCompleted = habit.last_completed;
              let newStreak = habit.streak;

              if (!lastCompleted) {
                newStreak = 1;
              } else {
                const lastDate = new Date(lastCompleted);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                  newStreak = habit.streak + 1;
                } else if (diffDays === 0) {
                  newStreak = habit.streak;
                } else {
                  newStreak = 1;
                }
              }

              // Update streak and total completions
              const newLongestStreak = Math.max(habit.longest_streak || 0, newStreak);
              const newTotalCompletions = (habit.total_completions || 0) + 1;
              
              db.run(
                `UPDATE habits 
                 SET streak = ?, longest_streak = ?, total_completions = ?, last_completed = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [newStreak, newLongestStreak, newTotalCompletions, today, id],
                (err) => {
                  if (err) {
                    console.error('Error updating streak:', err);
                    return res.status(500).json({ 
                      success: false, 
                      message: 'Error updating streak: ' + err.message 
                    });
                  }

                  // Check for badge awards
                  checkHabitBadges(req.userId, newStreak, id);
                  
                  // Award points for habit completion
                  awardPointsForHabit(req.userId, newStreak);

                  res.json({ 
                    success: true, 
                    streak: newStreak,
                    longest_streak: newLongestStreak,
                    total_completions: newTotalCompletions
                  });
                }
              );
            }
          );
        }
      );
    } else {
      res.json({ success: true, streak: habit.streak });
    }
  });
});

// Get habit completions
router.get('/:id/completions', verifyToken, (req, res) => {
  const { id } = req.params;

  db.all(
    'SELECT * FROM habit_completions WHERE habit_id = ? ORDER BY completion_date DESC',
    [id],
    (err, completions) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching completions' });
      }
      res.json({ success: true, completions });
    }
  );
});

// Delete habit
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM habits WHERE id = ? AND user_id = ?', [id, req.userId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting habit' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    res.json({ success: true });
  });
});

// Award points for habit completion
function awardPointsForHabit(userId, streak) {
  let points = 10; // Base points for completing a habit
  
  // Bonus points for streaks
  if (streak >= 7) points += 5;
  if (streak >= 21) points += 10;
  if (streak >= 30) points += 15;
  
  awardPoints(userId, points, 'Habit completion').catch(err => {
    console.error('Error awarding points:', err);
  });
}

// Check and award habit badges
function checkHabitBadges(userId, streak, habitId) {
  const badgeMilestones = [3, 7, 21, 30, 60, 90];
  
  if (badgeMilestones.includes(streak)) {
    db.get('SELECT title FROM habits WHERE id = ?', [habitId], (err, habit) => {
      const title = habit?.title || 'Habit';
      const badgeTitle = `${streak} Days ${title} ✅`;
      
      db.run(
        'INSERT INTO rewards (user_id, type, title, description) VALUES (?, ?, ?, ?)',
        [userId, 'habit', badgeTitle, `Completed ${streak} days of ${title}`],
        () => {
          // Award bonus points for milestone badges
          awardPoints(userId, 50, `Milestone badge: ${streak} days`).catch(err => {
            console.error('Error awarding milestone points:', err);
          });
        }
      );
    });
  }
}

module.exports = router;

