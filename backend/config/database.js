// backend/config/database.js
// Simple SQLite setup for demo. Creates a users table if missing.
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'nexanova.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('DB open error', err);
  console.log('✅ SQLite DB opened at', dbPath);
});

// Create minimal users table if not exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    path TEXT,
    ai_personality TEXT,
    mood_score INTEGER,
    anonymous_mode INTEGER DEFAULT 0,
    offline_mode INTEGER DEFAULT 1,
    store_chat INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
});

module.exports = { db };
