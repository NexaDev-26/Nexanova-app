// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database (initializes tables and indexes)
const { checkDatabaseHealth } = require('./config/database');

// Import centralized error handler
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const habitsRoutes = require('./routes/habits');
const financeRoutes = require('./routes/finance');
const journalRoutes = require('./routes/journal');
const chatRoutes = require('./routes/chat');
const rewardsRoutes = require('./routes/rewards');
const passwordResetRoutes = require('./routes/passwordReset');

const app = express();
const PORT = process.env.PORT || 5000;

// ═══════════════════════════════════════════════════════════════════════════
// CORS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// CORS configuration - secure origin validation
const corsOptions = {
  origin: (origin, callback) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = !isProduction;

    // Handle requests without origin header
    // These are typically same-origin requests or direct API calls
    if (!origin) {
      // In production: Only allow same-origin requests (no origin = same origin)
      // This is safe because browsers don't send Origin header for same-origin requests
      if (isProduction) {
        // In production, we still allow no-origin for same-origin requests
        // but we log it for security monitoring
        console.log('🔒 CORS: Same-origin request (no origin header)');
        return callback(null, true);
      }
      // In development: Allow for testing with tools like Postman/curl
      if (isDevelopment) {
        console.log('🔓 CORS: Development mode - allowing request without origin');
        return callback(null, true);
      }
    }

    // Validate origin header for cross-origin requests
    if (isProduction) {
      const allowedOrigins = [
        'https://nenoapp-eight.vercel.app',
        'https://nexanovaa.vercel.app',
        'https://nexanova.vercel.app'
      ];
      
      // Add custom frontend URL from environment variable
      if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
      }
      
      // Allow all Vercel preview deployments
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn('🚫 CORS blocked origin in production:', origin);
        return callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Development: allow localhost variations and common dev ports
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:5173', // Vite default
        'http://127.0.0.1:5173'
      ];
      
      // Check if origin is in allowed list or is a localhost/127.0.0.1 variant
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      
      if (allowedOrigins.includes(origin) || isLocalhost) {
        return callback(null, true);
      } else {
        console.warn('🚫 CORS blocked origin in development:', origin);
        return callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// ═══════════════════════════════════════════════════════════════════════════
// BODY PARSING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST LOGGING (Development)
// ═══════════════════════════════════════════════════════════════════════════
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`📥 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NexaNova Backend is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/password-reset', passwordResetRoutes);

// ═══════════════════════════════════════════════════════════════════════════
// STATIC FILES (Production)
// ═══════════════════════════════════════════════════════════════════════════
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Global error handler
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 NexaNova Backend Server                             ║
║                                                           ║
║   📍 URL: http://localhost:${PORT}                        ║
║   🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(10)}                   ║
║   📊 Database: SQLite (WAL mode)                         ║
║                                                           ║
║   API Endpoints:                                          ║
║   • /api/auth     - Authentication                        ║
║   • /api/user     - User profile                          ║
║   • /api/habits   - Habit tracking                        ║
║   • /api/finance  - Finance management                    ║
║   • /api/journal  - Journal entries                       ║
║   • /api/chat     - AI chat                               ║
║   • /api/rewards  - Rewards & badges                      ║
║   • /api/health   - Health check                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
