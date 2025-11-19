const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path for SQLite DB
const dbPath = path.join(__dirname, '../data/nexanova.db');
const dataDir = path.dirname(dbPath);

// Ensure /data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory:', dataDir);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
  } else {
    console.log('✅ Connected to database:', dbPath);
    db.run('PRAGMA foreign_keys = ON');
  }
});

// ----------- DATABASE INITIALIZATION -----------
const initDatabase = () => {

  // USERS
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      path TEXT,
      ai_personality TEXT,
      mood_score INTEGER DEFAULT 0,
      anonymous_mode INTEGER DEFAULT 0,
      offline_mode INTEGER DEFAULT 1,
      store_chat INTEGER DEFAULT 1,
      language TEXT DEFAULT 'en',
      currency TEXT DEFAULT 'TZS',
      country_code TEXT,
      city TEXT,
      region TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // HABITS
  db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT,
      category TEXT,
      difficulty TEXT DEFAULT 'easy',
      frequency TEXT DEFAULT 'daily',
      reminder_time TEXT,
      description TEXT,
      trigger TEXT,
      replacement TEXT,
      streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_completed TEXT,
      total_completions INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      target_streak INTEGER DEFAULT 30,
      start_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // HABIT COMPLETIONS
  db.run(`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      completion_date TEXT NOT NULL,
      notes TEXT,
      mood INTEGER,
      trigger TEXT,
      location TEXT,
      time_of_day TEXT,
      completion_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(habit_id, completion_date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    )
  `);

  // JOURNAL ENTRIES (HABITS)
  db.run(`
    CREATE TABLE IF NOT EXISTS habit_journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      reflection TEXT,
      mood_before INTEGER,
      mood_after INTEGER,
      trigger TEXT,
      challenges_faced TEXT,
      successes TEXT,
      lessons_learned TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    )
  `);

  // STREAK HISTORY
  db.run(`
    CREATE TABLE IF NOT EXISTS habit_streaks_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      streak_value INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    )
  `);

  // CHALLENGES
  db.run(`
    CREATE TABLE IF NOT EXISTS habit_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      challenge_type TEXT,
      challenge_name TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      target_habits TEXT,
      target_streak INTEGER DEFAULT 30,
      current_progress INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      badge_earned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // HABIT TEMPLATES
  db.run(`
    CREATE TABLE IF NOT EXISTS habit_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      category TEXT,
      difficulty TEXT DEFAULT 'easy',
      frequency TEXT DEFAULT 'daily',
      description TEXT,
      trigger TEXT,
      replacement TEXT,
      is_public INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ANALYTICS
  db.run(`
    CREATE TABLE IF NOT EXISTS habit_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completion_rate REAL DEFAULT 0,
      average_mood REAL,
      completion_count INTEGER DEFAULT 0,
      streak_value INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    )
  `);

  // REMINDERS
  db.run(`
    CREATE TABLE IF NOT EXISTS habit_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      reminder_time TEXT NOT NULL,
      days_of_week TEXT,
      is_enabled INTEGER DEFAULT 1,
      notification_type TEXT DEFAULT 'push',
      last_sent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    )
  `);

  // FINANCE
  db.run(`
    CREATE TABLE IF NOT EXISTS finance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      category TEXT,
      amount REAL,
      date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // AI CHATS
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message TEXT,
      response TEXT,
      mood_score INTEGER,
      path_context TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // REWARDS
  db.run(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      title TEXT,
      description TEXT,
      awarded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // BLUEPRINTS
  db.run(`
    CREATE TABLE IF NOT EXISTS journey_blueprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      path TEXT,
      ai_personality TEXT,
      plan_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // JOURNAL
  db.run(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      content TEXT,
      mood INTEGER DEFAULT 5,
      tags TEXT,
      date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log("✅ Database setup completed.");
};

module.exports = { db, initDatabase };
