-- Migration: Add Performance Indexes
-- Date: 2024
-- Description: Adds additional indexes for improved query performance

-- Habits indexes
CREATE INDEX IF NOT EXISTS idx_habits_start_date ON habits(start_date);

-- Finance indexes
CREATE INDEX IF NOT EXISTS idx_finance_recurring ON finance(recurring);
CREATE INDEX IF NOT EXISTS idx_finance_user_type_date ON finance(user_id, type, date);
CREATE INDEX IF NOT EXISTS idx_finance_user_category ON finance(user_id, category);

-- Journal indexes
CREATE INDEX IF NOT EXISTS idx_journal_user_mood ON journal_entries(user_id, mood);

-- Habit completions composite index
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date_mood ON habit_completions(habit_id, completion_date, mood);

-- Note: These indexes are automatically created by database.js on startup
-- This file is for reference and manual migration if needed

