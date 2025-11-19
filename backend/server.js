/**
 * NexaNova Backend Server
 * Cleaned, Optimized & Organized Version
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

/* ==========================================================================
   1. CORS CONFIGURATION (Supports Mobile IP Access)
   ========================================================================== */
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
   2. RATE LIMITING
   ========================================================================== */
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
   3. SECURITY HEADERS
   ========================================================================== */
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
   4. MIDDLEWARE
   ========================================================================== */
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

/* ==========================================================================
   5. DATABASE & SUPABASE INITIALIZATION
   ========================================================================== */
let db = null;
let supabase = null;

try {
  db = require('./config/database');
  console.log('✅ Database loaded');
} catch (err) {
  console.error('❌ Database load error:', err.message);
}

try {
  const sb = require('./config/supabase');
  supabase = sb.supabase;
  console.log('✅ Supabase loaded');
} catch {
  console.warn('⚠️ Supabase not configured');
}

/* ==========================================================================
   6. ROUTE LOADER
   ========================================================================== */
const loadRoutes = () => {
  const routes = [
    ['Auth', '/api/auth', './routes/auth'],
    ['PasswordReset', '/api/password-reset', './routes/passwordReset'],
    ['Habits', '/api/habits', './routes/habits'],
    ['Finance', '/api/finance', './routes/finance'],
    ['Chat', '/api/chat', './routes/chat'],
    ['Rewards', '/api/rewards', './routes/rewards'],
    ['User', '/api/user', './routes/user'],
    ['Journal', '/api/journal', './routes/journal'],
  ];

  if (process.env.NODE_ENV === 'development') {
    routes.push(['Dev', '/api/dev', './routes/dev']);
  }

  routes.forEach(([name, path, module]) => {
    try {
      const router = require(module);
      app.use(path, router);
      console.log(`✅ Loaded: ${name} → ${path}`);
    } catch (err) {
      console.error(`❌ Failed loading ${name}:`, err.message);
    }
  });
};

loadRoutes();

/* ==========================================================================
   7. HEALTH CHECK
   ========================================================================== */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NexaNova API running',
    timestamp: new Date().toISOString(),
  });
});

/* ==========================================================================
   8. SERVE FRONTEND (PRODUCTION)
   ========================================================================== */
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

/* ==========================================================================
   9. 404 HANDLER
   ========================================================================== */
app.use((req, res) => {
  console.log(`⚠️ Unmatched: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

/* ==========================================================================
   10. GLOBAL ERROR HANDLER
   ========================================================================== */
app.use((err, req, res, next) => {
  console.error('❌ ERROR:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

/* ==========================================================================
   11. PORT CLEANER
   ========================================================================== */
const killPort = async (port) => {
  const { exec } = require('child_process');
  const isWin = process.platform === 'win32';

  const cmd = isWin
    ? `powershell -Command "Get-NetTCPConnection -LocalPort ${port} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
    : `lsof -ti:${port} | xargs kill -9`;

  return new Promise((resolve) => exec(cmd, () => setTimeout(resolve, 500)));
};

/* ==========================================================================
   12. SERVER + WEBSOCKET STARTUP
   ========================================================================== */
async function startServer() {
  console.log(`🔄 Clearing port ${PORT}...`);
  await killPort(PORT);

  const httpServer = http.createServer(app);
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('🔌 WS Connected');

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket active',
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', (msg) => {
      try {
        console.log('WS message:', msg);
        ws.send(JSON.stringify({ type: 'ack', received: msg }));
      } catch (err) {
        console.error('WS Error:', err.message);
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NexaNova API running on ${PORT}`);
    console.log(`🔌 WS: ws://localhost:${PORT}/ws`);
  });
}

startServer();
