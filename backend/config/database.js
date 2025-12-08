// backend/config/database.js
// SQLite setup with all required tables and optimized indexes
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'nexanova.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('❌ DB open error', err);
  console.log('✅ SQLite DB opened at', dbPath);
});

// Enable foreign keys and WAL mode for better performance
db.run('PRAGMA foreign_keys = ON');
db.run('PRAGMA journal_mode = WAL');

// Create all tables with proper schema
db.serialize(() => {
  // ═══════════════════════════════════════════════════════════════════════════
  // USERS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    path TEXT,
    ai_personality TEXT DEFAULT 'friend',
    mood_score INTEGER DEFAULT 5,
    anonymous_mode INTEGER DEFAULT 0,
    offline_mode INTEGER DEFAULT 1,
    store_chat INTEGER DEFAULT 1,
    language TEXT DEFAULT 'en',
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Add language column to existing users table if it doesn't exist
  db.run(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'`, (err) => {
    // Ignore error if column already exists
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding language column:', err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HABITS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('build', 'break')),
    category TEXT,
    difficulty TEXT DEFAULT 'easy' CHECK(difficulty IN ('easy', 'medium', 'hard')),
    frequency TEXT DEFAULT 'daily' CHECK(frequency IN ('daily', 'weekly', 'custom')),
    reminder_time TEXT,
    description TEXT,
    "trigger" TEXT,
    replacement TEXT,
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed TEXT,
    total_completions INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    target_streak INTEGER DEFAULT 30,
    start_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // ═══════════════════════════════════════════════════════════════════════════
  // HABIT COMPLETIONS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    completion_date TEXT NOT NULL,
    notes TEXT,
    mood INTEGER CHECK(mood >= 1 AND mood <= 10),
    "trigger" TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(habit_id, completion_date),
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  )`);

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS finance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    date TEXT NOT NULL,
    description TEXT,
    recurring INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  
  // Add recurring column to existing finance table if it doesn't exist
  db.run(`ALTER TABLE finance ADD COLUMN recurring INTEGER DEFAULT 0`, (err) => {
    // Ignore error if column already exists
    if (err && !err.message.includes('duplicate column') && !err.message.includes('duplicate column name')) {
      console.warn('Warning adding recurring column:', err.message);
    } else if (!err) {
      console.log('✅ Added recurring column to finance table');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // JOURNAL ENTRIES TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    mood INTEGER DEFAULT 5 CHECK(mood >= 1 AND mood <= 10),
    tags TEXT,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // ═══════════════════════════════════════════════════════════════════════════
  // AI CHATS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS ai_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    mood_score INTEGER CHECK(mood_score >= 0 AND mood_score <= 10),
    path_context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // ═══════════════════════════════════════════════════════════════════════════
  // REWARDS/BADGES TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // ═══════════════════════════════════════════════════════════════════════════
  // POINTS HISTORY TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS points_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVINGS GOALS TABLE (New - for enhanced finance tracking)
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount REAL NOT NULL CHECK(target_amount > 0),
    current_amount REAL DEFAULT 0 CHECK(current_amount >= 0),
    deadline TEXT,
    is_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUDGETS TABLE (New - for budget management)
  // ═══════════════════════════════════════════════════════════════════════════
  db.run(`CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    period TEXT DEFAULT 'monthly' CHECK(period IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  console.log('✅ All database tables initialized');

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE INDEXES FOR PERFORMANCE OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Users indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  
  // Habits indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active)');
  db.run('CREATE INDEX IF NOT EXISTS idx_habits_last_completed ON habits(last_completed)');
  
  // Habit completions indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completion_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON habit_completions(habit_id, completion_date)');
  
  // Finance indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_finance_user_id ON finance(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_finance_date ON finance(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_finance_user_date ON finance(user_id, date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_finance_user_type ON finance(user_id, type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_finance_category ON finance(category)');
  // Note: idx_finance_recurring is created later after ensuring column exists
  
  // Journal entries indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date)');
  
  // AI chats indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_ai_chats_created ON ai_chats(created_at)');
  
  // Rewards indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(type)');
  
  // Points history indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_points_user_id ON points_history(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_points_created ON points_history(created_at)');
  
  // Savings goals indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id)');
  
  // Budgets indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_budgets_user_active ON budgets(user_id, is_active)');
  
  // Additional performance indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_habits_start_date ON habits(start_date)');
  // Create recurring index - handle error gracefully if column doesn't exist yet
  // (will be created on next restart after ALTER TABLE adds the column)
  db.run('CREATE INDEX IF NOT EXISTS idx_finance_recurring ON finance(recurring)', (err) => {
    if (err && err.message.includes('no such column')) {
      // Column will be added by ALTER TABLE above, index will be created on next restart
      console.log('ℹ️ Recurring index will be created after column is added');
    } else if (err && !err.message.includes('already exists')) {
      console.warn('Warning creating recurring index:', err.message);
    }
  });
  db.run('CREATE INDEX IF NOT EXISTS idx_finance_user_type_date ON finance(user_id, type, date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_journal_user_mood ON journal_entries(user_id, mood)');
  db.run('CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date_mood ON habit_completions(habit_id, completion_date, mood)');
  db.run('CREATE INDEX IF NOT EXISTS idx_finance_user_category ON finance(user_id, category)');

  console.log('✅ Database indexes created for optimization');
});

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Promisified db.run for async/await usage
 */
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

/**
 * Promisified db.get for async/await usage
 */
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Promisified db.all for async/await usage
 */
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

/**
 * Run database health check
 */
const checkDatabaseHealth = async () => {
  try {
    const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table'");
    const indexes = await dbAll("SELECT name FROM sqlite_master WHERE type='index'");
    
    return {
      status: 'healthy',
      tables: tables.map(t => t.name),
      indexCount: indexes.length,
      path: dbPath
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
};

module.exports = { 
  db, 
  dbRun, 
  dbGet, 
  dbAll,
  checkDatabaseHealth 
};
