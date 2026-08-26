import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import morgan from 'morgan';
import connectDB, { getDBStatus } from './config/database.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import deliveryFeeRoutes from './routes/deliveryFeeRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();

// Trust reverse proxy for Render / Cloud hosting (ensures accurate req.ip for rate limiting)
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// ============== Security Middleware ==============
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Set security HTTP headers
app.use(mongoSanitize()); // Data sanitization against NoSQL injection
app.use(compression()); // Compress response data

// ============== CORS Configuration ==============
const rawOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
  process.env.CLIENT_URL
];

// Handle comma-separated list of origins in environment variables
const configuredOrigins = rawOrigins
  .filter(Boolean)
  .flatMap(url => (typeof url === 'string' ? url.split(',') : [url]))
  .map(url => url.trim().toLowerCase().replace(/\/$/, ''))
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Server-to-server, mobile, postman, health checks
  const normOrigin = origin.toLowerCase().trim().replace(/\/$/, '');

  if (configuredOrigins.includes(normOrigin)) return true;

  // Allow all Vercel production and preview deployment URLs (*.vercel.app)
  if (normOrigin.endsWith('.vercel.app') || /\.vercel\.app$/.test(normOrigin)) {
    return true;
  }

  // Allow Render URLs (*.onrender.com)
  if (normOrigin.endsWith('.onrender.com') || /\.onrender\.com$/.test(normOrigin)) {
    return true;
  }

  // Allow localhost on any port during local development
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normOrigin)) {
    return true;
  }

  return false;
};

const corsMiddleware = cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
});

app.use(corsMiddleware);

// Explicit preflight handler with identical configuration
app.options('*', corsMiddleware);

// ============== Body Parser & Logging ==============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
  app.use(requestLogger);
}

// ============== Rate Limiting ==============
app.use('/api/', rateLimiter);

// ============== Health Check Endpoints (For Render / Uptime Monitoring) ==============
const healthCheckHandler = (req, res) => {
  const dbStatus = getDBStatus();
  const isHealthy = dbStatus.isConnected;

  res.status(isHealthy ? 200 : 503).json({ 
    status: isHealthy ? 'ok' : 'degraded', 
    service: 'SKLP E-Commerce Backend API',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development'
  });
};

app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// ============== Root Welcome Route ==============
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SKLP Fashion E-Commerce Backend API Running 🚀',
    version: '1.0.0',
    docs: '/api/health'
  });
});

// ============== API Routes ==============
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/delivery-fee', deliveryFeeRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/payments', paymentRoutes);

// ============== 404 Handler ==============
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// ============== Error Handler ==============
app.use(errorHandler);

// ============== Server Setup ==============
const PORT = process.env.PORT || process.env.BACKEND_PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║         SKLP BACKEND SERVER STARTED               ║
║  🚀 Server running on http://localhost:${PORT}  ║
║  📍 Environment: ${process.env.NODE_ENV}                ║
║  🔐 Security: Enabled                             ║
║  ✅ Delivery Routes: Active                       ║
║  ✅ All 4 Account Types: Ready                    ║
╚═══════════════════════════════════════════════════╝
  `);
});

// ============== Graceful Shutdown ==============
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

export default app;
