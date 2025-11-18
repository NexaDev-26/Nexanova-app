/**
 * Vercel Serverless Function Entry Point
 * This file serves as the main handler for all API requests in Vercel
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Enhanced CORS configuration for Vercel deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, allow frontend Vercel deployment and localhost for testing
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://nexanova.vercel.app',
      /\.vercel\.app$/  // Allow all Vercel preview deployments
    ];
    
    let isAllowed = false;
    for (const allowed of allowedOrigins) {
      if (allowed instanceof RegExp) {
        if (allowed.test(origin)) {
          isAllowed = true;
          break;
        }
      } else if (allowed === origin) {
        isAllowed = true;
        break;
      }
    }
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'NexaNova API is running', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Database initialization (SQLite or fallback)
let db;
try {
  db = require('../config/database');
  console.log('✅ Database module loaded');
} catch (error) {
  console.warn('⚠️ Database error:', error.message);
  console.warn('   Using in-memory storage fallback');
}

// Supabase initialization
let supabase;
try {
  const supabaseConfig = require('../config/supabase');
  supabase = supabaseConfig.supabase;
  if (supabase) {
    console.log('✅ Supabase client initialized');
  } else {
    console.warn('⚠️ Supabase not available - using fallback');
  }
} catch (error) {
  console.warn('⚠️ Supabase initialization failed:', error.message);
}

// Load API routes
const loadRoutes = () => {
  const routes = [
    { path: '/auth', module: '../routes/auth', name: 'Auth' },
    { path: '/password-reset', module: '../routes/passwordReset', name: 'PasswordReset' },
    { path: '/habits', module: '../routes/habits', name: 'Habits' },
    { path: '/finance', module: '../routes/finance', name: 'Finance' },
    { path: '/chat', module: '../routes/chat', name: 'Chat' },
    { path: '/rewards', module: '../routes/rewards', name: 'Rewards' },
    { path: '/user', module: '../routes/user', name: 'User' },
    { path: '/journal', module: '../routes/journal', name: 'Journal' }
  ];

  // Development routes
  if (process.env.NODE_ENV === 'development') {
    routes.push({ path: '/dev', module: '../routes/dev', name: 'Dev' });
  }

  routes.forEach(route => {
    try {
      const router = require(route.module);
      if (router && typeof router === 'function') {
        app.use(route.path, router);
        console.log(`✅ ${route.name} routes loaded at ${route.path}`);
      } else {
        console.error(`❌ ${route.name} router is not a function`);
      }
    } catch (error) {
      console.error(`❌ Error loading ${route.name} routes:`, error.message);
    }
  });
};

loadRoutes();

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel serverless
module.exports = app;
