const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration for mobile access
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development (for mobile testing via IP)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, whitelist specific origins
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Still allow for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth endpoints to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Content Security Policy (adjust for your needs)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  }
  
  next();
});

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Database initialization
let db;
try {
  db = require('./config/database');
  console.log('✅ Database module loaded');
} catch (error) {
  console.error('❌ Error loading database module:', error);
  console.warn('⚠️ Server will continue but database features may not work');
  // Don't exit in development - nodemon will handle restart
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Supabase initialization
let supabase;
try {
  const supabaseConfig = require('./config/supabase');
  supabase = supabaseConfig.supabase;
  if (supabase) {
    console.log('✅ Supabase client loaded');
  }
} catch (error) {
  console.warn('⚠️ Supabase not configured:', error.message);
  console.warn('   Server will continue with SQLite database');
}

// Load API routes
const loadRoutes = () => {
  const routes = [
    { path: '/api/auth', module: './routes/auth', name: 'Auth' },
    { path: '/api/password-reset', module: './routes/passwordReset', name: 'PasswordReset' },
    { path: '/api/habits', module: './routes/habits', name: 'Habits' },
    { path: '/api/finance', module: './routes/finance', name: 'Finance' },
    { path: '/api/chat', module: './routes/chat', name: 'Chat' },
    { path: '/api/rewards', module: './routes/rewards', name: 'Rewards' },
    { path: '/api/user', module: './routes/user', name: 'User' },
    { path: '/api/journal', module: './routes/journal', name: 'Journal' }
  ];

  // Development routes
  if (process.env.NODE_ENV === 'development') {
    routes.push({ path: '/api/dev', module: './routes/dev', name: 'Dev' });
  }

  routes.forEach(route => {
    try {
      const router = require(route.module);
      if (router && typeof router === 'function') {
        app.use(route.path, router);
        console.log(`✅ ${route.name} routes loaded at ${route.path}`);
        // Log specific routes for auth module
        if (route.name === 'Auth' && router.stack) {
          console.log(`   📋 Available auth routes:`);
          router.stack.forEach((layer) => {
            if (layer.route) {
              const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
              console.log(`      └─ ${methods} ${route.path}${layer.route.path}`);
            } else if (layer.regexp) {
              // Handle middleware or regex routes
              console.log(`      └─ [Middleware/Regex] ${layer.name || 'unnamed'}`);
            }
          });
        }
      } else if (router && router.default && typeof router.default === 'function') {
        // Handle ES6 default exports
        app.use(route.path, router.default);
        console.log(`✅ ${route.name} routes loaded at ${route.path} (default export)`);
      } else {
        console.error(`❌ ${route.name} router is null, undefined, or not a function`);
        console.error(`   Router type: ${typeof router}`);
        console.error(`   Router value:`, router);
      }
    } catch (error) {
      console.error(`❌ Error loading ${route.name} routes:`, error.message);
      console.error(`   Stack:`, error.stack);
    }
  });
};

loadRoutes();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NexaNova API is running', timestamp: new Date().toISOString() });
});

// Test endpoint to verify route registration
app.get('/api/test-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      routes.push(`${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // This is a router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
          routes.push(`${methods} ${middleware.regexp.source}${handler.route.path}`);
        }
      });
    }
  });
  res.json({ 
    status: 'ok', 
    message: 'Route test endpoint',
    routes: routes.slice(0, 20), // Limit to first 20 routes
    totalRoutes: routes.length
  });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Handle frontend routes in development (before 404 handler)
if (process.env.NODE_ENV === 'development') {
  // List of frontend routes that should not be handled by backend
  const frontendRoutes = ['/dashboard', '/login', '/onboarding', '/habits', '/finance', '/journal', '/profile', '/ai-chat', '/qr', '/forgot-password'];
  
  app.use((req, res, next) => {
    // If it's a frontend route and not an API call, provide helpful message
    if (frontendRoutes.includes(req.path) && !req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        message: `${req.method} ${req.path} is a frontend route`,
        hint: 'This is the backend API server. The frontend runs separately in development.',
        frontendUrl: `http://localhost:${process.env.FRONTEND_PORT || '3000'}`,
        apiEndpoint: '/api/health',
        note: 'Access the frontend application at the frontend URL above. This route is handled by React Router.'
      });
    }
    next();
  });
}

// 404 handler for undefined routes (must be after all routes)
app.use((req, res, next) => {
  // Log all unmatched routes for debugging
  console.log(`⚠️ Unmatched route: ${req.method} ${req.path}`);
  
  // Only send helpful message for non-API routes in development
  if (!req.path.startsWith('/api') && process.env.NODE_ENV === 'development') {
    return res.status(404).json({
      success: false,
      message: `${req.method} ${req.path} not found`,
      hint: 'This is the backend API server. In development, the frontend runs on http://localhost:3000',
      apiEndpoint: '/api/health',
      frontendUrl: 'http://localhost:3000'
    });
  }
  
  // Standard 404 for API routes or production
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`,
    hint: process.env.NODE_ENV === 'development' ? 'Check if route is registered in server.js' : undefined,
    availableRoutes: process.env.NODE_ENV === 'development' ? [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/user/profile',
      'GET /api/health'
    ] : undefined
  });
});

// Error logging helper
const logError = (err, req) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    method: req.method,
    path: req.path,
    status: err.status || 500,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress
  };
  
  console.error('❌ Server Error:', JSON.stringify(errorLog, null, 2));
  
  // In production, you could write to a log file or send to error tracking service
  // fs.appendFileSync('error.log', JSON.stringify(errorLog) + '\n');
};

// Error handler middleware (must be after routes and 404 handler)
app.use((err, req, res, next) => {
  logError(err, req);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: isDevelopment ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // In development, log but don't exit - nodemon will handle restart
  if (process.env.NODE_ENV === 'production') {
    console.error('💀 Fatal error in production - exiting');
    process.exit(1);
  } else {
    console.warn('⚠️ Error caught - nodemon will restart automatically');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  if (reason && reason.stack) {
    console.error('Stack:', reason.stack);
  }
  // In development, log but don't exit - nodemon will handle restart
  if (process.env.NODE_ENV === 'production') {
    console.error('💀 Fatal promise rejection in production - exiting');
    process.exit(1);
  } else {
    console.warn('⚠️ Promise rejection caught - server continues');
  }
});

// Function to kill processes on a port (improved - returns Promise)
function killPort(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const isWindows = process.platform === 'win32';
    const command = isWindows
      ? `powershell -Command "$conn = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue; if ($conn) { $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"`
      : `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`;
    
    exec(command, (error) => {
      // Wait a bit for the port to be released
      setTimeout(() => {
        if (!error) {
          console.log(`✅ Cleaned up port ${port}`);
        }
        resolve();
      }, 500);
    });
  });
}

// Start server
async function startServer() {
  try {
    // Kill any existing processes on port 5000 before starting
    console.log(`🔄 Cleaning up port ${PORT}...`);
    await killPort(PORT);
    
    // Additional wait to ensure port is released
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start server
    try {
      // Create HTTP server
      const httpServer = http.createServer(app);
      
      // Create WebSocket server
      const wss = new WebSocket.Server({ 
          server: httpServer,
          path: '/ws'
        });

      // Handle WebSocket connections
      wss.on('connection', (ws, req) => {
          console.log('✅ WebSocket client connected');
          
          ws.on('message', (message) => {
            try {
              const data = JSON.parse(message);
              console.log('📨 WebSocket message received:', data);
              // Echo back or handle message as needed
              ws.send(JSON.stringify({ 
                type: 'ack', 
                message: 'Message received',
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              console.error('❌ WebSocket message error:', error);
            }
          });

          ws.on('close', () => {
            console.log('👋 WebSocket client disconnected');
          });

          ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
          });

          // Send welcome message
          ws.send(JSON.stringify({ 
            type: 'connected', 
            message: 'WebSocket connection established',
            timestamp: new Date().toISOString()
          }));
        });

      // Start HTTP server (which includes WebSocket)
      const server = httpServer.listen(PORT, '0.0.0.0', () => {
          console.log(`🚀 NexaNova server running on port ${PORT}`);
          console.log(`📱 Access from network: http://YOUR_IP:${PORT}`);
          console.log(`💻 Access locally: http://localhost:${PORT}`);
          console.log(`🔌 WebSocket server available at ws://localhost:${PORT}/ws`);
          
          // Initialize database after server starts
          if (db && typeof db.initDatabase === 'function') {
            try {
              db.initDatabase();
              console.log('✅ Database initialization started');
            } catch (dbError) {
              console.error('❌ Error initializing database:', dbError);
              console.warn('⚠️ Server will continue without database initialization');
            }
          }
        });

      // Handle server errors (e.g., port already in use)
      server.on('error', async (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${PORT} is still in use!`);
          console.warn('💡 Attempting aggressive cleanup...');
          
          // More aggressive cleanup
          await killPort(PORT);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.warn('⚠️ Please manually run: .\\kill-port-5000.ps1');
          console.warn('   Or restart your computer if the issue persists');
          console.warn('   Then try starting the server again');
        } else {
          console.error('❌ Server error:', err.message);
          console.error('Error code:', err.code);
        }
      });
    } catch (listenError) {
        console.error('❌ Error calling app.listen():', listenError.message);
        console.error('Stack:', listenError.stack);
        // Don't exit in development - nodemon will restart
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      }
  } catch (startError) {
    console.error('❌ Error in startServer():', startError.message);
    console.error('Stack:', startError.stack);
    // Don't exit in development - nodemon will restart
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Start the server
startServer();
