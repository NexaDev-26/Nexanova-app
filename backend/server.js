// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------- CORS ---------- */
const allowed = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'https://nexanovaa.vercel.app'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    return callback(null, allowed.includes(origin));
  },
  credentials: true
};
app.use(cors(corsOptions));

/* ---------- Rate limiting ---------- */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use('/api', generalLimiter);

/* ---------- Middleware ---------- */
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

/* ---------- Security headers ---------- */
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});

/* ---------- Database ---------- */
let db;
try {
  db = require('./config/database').db;
  console.log('✅ Database ready');
} catch (e) {
  console.warn('⚠️ Database module failed:', e.message);
}

/* ---------- Supabase ---------- */
let supabase;
try {
  supabase = require('./config/supabase').supabase;
  console.log('✅ Supabase client ready');
} catch (e) {}

/* ---------- AUTO ROUTE LOADER ---------- */
const routes = [
  ['/api/auth', './routes/auth'],
  ['/api/user', './routes/user']
];

routes.forEach(([routePath, modulePath]) => {
  try {
    const router = require(modulePath);
    app.use(routePath, router);
    console.log(`✅ Loaded route ${routePath}`);
  } catch (err) {
    console.warn(`⚠️ Route ${routePath} not loaded: ${err.message}`);
  }
});

/* ---------- Root Route ---------- */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NexaNova backend is running successfully!',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

/* ---------- Healthcheck ---------- */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NexaNova API running',
    timestamp: new Date().toISOString()
  });
});

/* ---------- 404 Handler ---------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

/* ---------- Error Handler ---------- */
app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error'
  });
});

/* ---------- WebSocket ---------- */
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket active',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (m) => {
    console.log('WS message:', m);
    ws.send(JSON.stringify({ type: 'ack', received: m }));
  });
});

/* ---------- Start Server ---------- */
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NexaNova API running on port ${PORT}`);
});

module.exports = app;
