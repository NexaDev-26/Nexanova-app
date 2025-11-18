const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// JWT Secret - must be set in production
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
    console.error('   Set JWT_SECRET in your .env file before starting in production.');
    process.exit(1);
  }
  // Development fallback (not secure - only for local development)
  // This message only appears if JWT_SECRET is not set in .env
  const fallbackSecret = 'nexanova-secret-key-change-in-production';
  if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
    console.log('ℹ️  Using default JWT_SECRET for development. Set JWT_SECRET in .env for production.');
  }
  return fallbackSecret;
})();

// Input validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Register
router.post('/register', (req, res) => {
  console.log('📝 Registration request received:', {
    hasEmail: !!req.body.email,
    hasPassword: !!req.body.password,
    hasPath: !!req.body.path,
    hasPersonality: !!req.body.ai_personality,
    bodyKeys: Object.keys(req.body)
  });
  
  const { nickname, email, password, path, ai_personality, anonymous_mode, offline_mode, store_chat } = req.body;

  if (!email || !password || !path || !ai_personality) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Validate email format
  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ success: false, message: passwordValidation.message });
  }

  // Sanitize inputs
  const sanitizedEmail = email.trim().toLowerCase();
  const sanitizedPath = path.trim().toLowerCase();
  const sanitizedPersonality = ai_personality.trim().toLowerCase();

  // Check if email already exists
  db.get('SELECT id FROM users WHERE email = ?', [sanitizedEmail], (err, existingUser) => {
    if (err) {
      console.error('❌ Database error checking email:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists. Please use a different email or login instead.' });
    }

    // Check nickname if provided and not anonymous
    const finalNickname = (anonymous_mode || !nickname || nickname.trim() === '') ? null : nickname.trim();
    
    if (finalNickname) {
      db.get('SELECT id FROM users WHERE nickname = ?', [finalNickname], (err, existingNickname) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (existingNickname) {
          return res.status(400).json({ success: false, message: 'Nickname already taken. Please choose a different one.' });
        }

        // Proceed with registration
        proceedWithRegistration();
      });
    } else {
      // Proceed with registration (anonymous mode)
      proceedWithRegistration();
    }

    function proceedWithRegistration() {
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error hashing password' });
        }

        // Extract mood_score from request body (default to 5 if not provided)
        const moodScore = req.body.mood_score || 5;
        // Ensure mood_score is between 1 and 10
        const finalMoodScore = Math.max(1, Math.min(10, parseInt(moodScore) || 5));

        db.run(
          `INSERT INTO users (nickname, email, password_hash, path, ai_personality, mood_score, anonymous_mode, offline_mode, store_chat)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [finalNickname, sanitizedEmail, hash, sanitizedPath, sanitizedPersonality, finalMoodScore, anonymous_mode ? 1 : 0, offline_mode !== false ? 1 : 0, store_chat !== false ? 1 : 0],
          function(err) {
            if (err) {
              console.error('Registration error:', err);
              if (err.message && err.message.includes('UNIQUE constraint')) {
                return res.status(400).json({ success: false, message: 'Email or nickname already exists' });
              }
              return res.status(500).json({ success: false, message: 'Error creating user: ' + err.message });
            }

            const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '30d' });
            
            // Get the created user
            db.get('SELECT id, nickname, email, path, ai_personality, mood_score, anonymous_mode, offline_mode, store_chat, created_at FROM users WHERE id = ?', [this.lastID], (err, user) => {
              if (err || !user) {
                return res.status(500).json({ success: false, message: 'User created but failed to retrieve user data' });
              }
              
              res.json({ success: true, user_id: this.lastID, token, user });
            });
          }
        );
      });
    }
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  // Validate email format
  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  // Sanitize email
  const sanitizedEmail = email.trim().toLowerCase();

  db.get('SELECT * FROM users WHERE email = ?', [sanitizedEmail], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    bcrypt.compare(password, user.password_hash, (err, match) => {
      if (err || !match) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      const { password_hash, ...userWithoutPassword } = user;
      res.json({ success: true, token, user: userWithoutPassword });
    });
  });
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
};

module.exports = router;
module.exports.verifyToken = verifyToken;

