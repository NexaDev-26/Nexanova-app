-- ============================================
-- NexaNova Supabase Database Schema
-- PostgreSQL Schema for Supabase
-- ============================================
-- 
-- Instructions:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. Tables will be created automatically
--
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nickname VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    path TEXT CHECK(path IN ('mind_reset', 'money_builder', 'habit_transformer', 'all')),
    ai_personality TEXT CHECK(ai_personality IN ('wise_sage', 'coach', 'friend')),
    mood_score INTEGER DEFAULT 0,
    anonymous_mode BOOLEAN DEFAULT false,
    offline_mode BOOLEAN DEFAULT true,
    store_chat BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'TZS',
    country_code VARCHAR(10),
    city VARCHAR(100),
    region VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HABITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    type TEXT CHECK(type IN ('break', 'build')) NOT NULL,
    category VARCHAR(50),
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
    frequency TEXT DEFAULT 'daily',
    reminder_time VARCHAR(10),
    description TEXT,
    trigger TEXT,
    replacement TEXT,
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed DATE,
    total_completions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    target_streak INTEGER DEFAULT 30,
    start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HABIT COMPLETIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habit_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    notes TEXT,
    mood INTEGER CHECK(mood >= 1 AND mood <= 10),
    trigger TEXT,
    location TEXT,
    time_of_day VARCHAR(20),
    completion_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, completion_date)
);

-- ============================================
-- HABIT JOURNAL ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habit_journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    reflection TEXT,
    mood_before INTEGER CHECK(mood_before >= 1 AND mood_before <= 10),
    mood_after INTEGER CHECK(mood_after >= 1 AND mood_after <= 10),
    trigger TEXT,
    challenges_faced TEXT,
    successes TEXT,
    lessons_learned TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HABIT STREAKS HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habit_streaks_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    streak_value INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HABIT CHALLENGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habit_challenges (
    id UUID DEFAULT gen_random_uuid()PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_type TEXT CHECK(challenge_type IN ('30_day', 'stacking', 'micro', 'custom')),
    challenge_name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    target_habits TEXT,
    target_streak INTEGER DEFAULT 30,
    current_progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    badge_earned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- HABIT TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habit_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
    frequency TEXT DEFAULT 'daily',
    description TEXT,
    trigger TEXT,
    replacement TEXT,
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HABIT ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habit_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    average_mood DECIMAL(3,1),
    completion_count INTEGER DEFAULT 0,
    streak_value INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, date)
);

-- ============================================
-- HABIT REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habit_reminders (
    id UUID DEFAULT gen_random_uuid()PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    days_of_week TEXT,
    is_enabled BOOLEAN DEFAULT true,
    notification_type TEXT CHECK(notification_type IN ('push', 'email', 'sms')) DEFAULT 'push',
    last_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FINANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS finance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    category VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI CHATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    mood_score INTEGER,
    path_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REWARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('habit', 'financial', 'mind_reset')) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOURNEY BLUEPRINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS journey_blueprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    path TEXT,
    ai_personality TEXT,
    plan_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOURNAL ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content TEXT NOT NULL,
    mood INTEGER DEFAULT 5 CHECK(mood >= 1 AND mood <= 10),
    tags TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- Habits indexes
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_type ON habits(type);
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active);

-- Habit completions indexes
CREATE INDEX IF NOT EXISTS idx_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_completions_date ON habit_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_completions_habit_date ON habit_completions(habit_id, completion_date);

-- Habit journal entries indexes
CREATE INDEX IF NOT EXISTS idx_journal_habit_id ON habit_journal_entries(habit_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON habit_journal_entries(entry_date);

-- Habit streaks history indexes
CREATE INDEX IF NOT EXISTS idx_streaks_habit_id ON habit_streaks_history(habit_id);
CREATE INDEX IF NOT EXISTS idx_streaks_active ON habit_streaks_history(habit_id, is_active);

-- Habit challenges indexes
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON habit_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON habit_challenges(user_id, is_completed);

-- Habit analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_habit_date ON habit_analytics(habit_id, date);

-- Habit reminders indexes
CREATE INDEX IF NOT EXISTS idx_reminders_habit_id ON habit_reminders(habit_id);
CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON habit_reminders(is_enabled);

-- Finance indexes
CREATE INDEX IF NOT EXISTS idx_finance_user_id ON finance(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_date ON finance(date);
CREATE INDEX IF NOT EXISTS idx_finance_user_date ON finance(user_id, date);

-- AI chats indexes
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_created_at ON ai_chats(created_at);

-- Rewards indexes
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(type);

-- Journal entries indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_streaks_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Users: Backend operations (using service role key bypasses RLS)
-- For custom JWT auth, backend uses service role key which bypasses all RLS
-- These policies are for frontend direct access (if needed)

-- Allow backend to insert users (service role bypasses this, but good to have)
CREATE POLICY "Backend can insert users" ON users
    FOR INSERT WITH CHECK (true);

-- Allow backend to read users (for login/verification)
CREATE POLICY "Backend can read users" ON users
    FOR SELECT USING (true);

-- Allow backend to update users (for profile updates)
CREATE POLICY "Backend can update users" ON users
    FOR UPDATE USING (true) WITH CHECK (true);

-- Users can view own profile (if using Supabase Auth)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update own profile (if using Supabase Auth)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Habits: Users can manage their own habits
CREATE POLICY "Users can manage own habits" ON habits
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Habit completions: Users can manage their own completions
CREATE POLICY "Users can manage own completions" ON habit_completions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM habits 
            WHERE habits.id = habit_completions.habit_id 
            AND habits.user_id::text = auth.uid()::text
        )
    );

-- Habit journal entries: Users can manage their own entries
CREATE POLICY "Users can manage own journal entries" ON habit_journal_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM habits 
            WHERE habits.id = habit_journal_entries.habit_id 
            AND habits.user_id::text = auth.uid()::text
        )
    );

-- Habit streaks history: Users can view their own streaks
CREATE POLICY "Users can view own streaks" ON habit_streaks_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM habits 
            WHERE habits.id = habit_streaks_history.habit_id 
            AND habits.user_id::text = auth.uid()::text
        )
    );

-- Habit challenges: Users can manage their own challenges
CREATE POLICY "Users can manage own challenges" ON habit_challenges
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Habit templates: Users can manage their own templates, public ones are readable
CREATE POLICY "Users can manage own templates" ON habit_templates
    FOR ALL USING (
        user_id::text = auth.uid()::text OR is_public = true
    );

-- Habit analytics: Users can view their own analytics
CREATE POLICY "Users can view own analytics" ON habit_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM habits 
            WHERE habits.id = habit_analytics.habit_id 
            AND habits.user_id::text = auth.uid()::text
        )
    );

-- Habit reminders: Users can manage their own reminders
CREATE POLICY "Users can manage own reminders" ON habit_reminders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM habits 
            WHERE habits.id = habit_reminders.habit_id 
            AND habits.user_id::text = auth.uid()::text
        )
    );

-- Finance: Users can manage their own finance data
CREATE POLICY "Users can manage own finance" ON finance
    FOR ALL USING (auth.uid()::text = user_id::text);

-- AI chats: Users can manage their own chats
CREATE POLICY "Users can manage own chats" ON ai_chats
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Rewards: Users can view their own rewards
CREATE POLICY "Users can view own rewards" ON rewards
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Journey blueprints: Users can manage their own blueprints
CREATE POLICY "Users can manage own blueprints" ON journey_blueprints
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Journal entries: Users can manage their own entries
CREATE POLICY "Users can manage own journal entries" ON journal_entries
    FOR ALL USING (auth.uid()::text = user_id::text);

-- ============================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_journal_entries_updated_at BEFORE UPDATE ON habit_journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_reminders_updated_at BEFORE UPDATE ON habit_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ NexaNova database schema created successfully!';
    RAISE NOTICE '✅ All tables, indexes, and RLS policies are in place.';
    RAISE NOTICE '✅ Your Supabase database is ready to use.';
END $$;

