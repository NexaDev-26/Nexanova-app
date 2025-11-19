/**
 * NexaNova Backend Server
 * Render-ready Version
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config(); // Render injects env vars automatically

const app = express();
const PORT = process.env.PORT || 5000;

/* ==========================================================================
// 1. CORS CONFIGURATION
// ========================================================================== */
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    const allowed = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000'];

    return callback(null, allowed.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
};

/* ==========================================================================
// 2. RATE LIMITING
// ========================================================================== */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, try later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, try again later.',
});

/* ==========================================================================
// 3. SECURITY HEADERS
// ========================================================================== */
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });

  res.removeHeader('X-Powered-By');

  if (process.env.NODE_ENV === 'production') {
    res.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    );
  }

  next();
});

/* ==========================================================================
// 4. MIDDLEWARE
// ========================================================================== */
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

