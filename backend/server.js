import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import morgan from 'morgan';
import 'dotenv/config';
import connectDB from './config/database.js';
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

const app = express();

// Connect to Database
connectDB();

// ============== Security Middleware ==============
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Data sanitization against NoSQL injection
app.use(compression()); // Compress response data

// ============== CORS Configuration ==============
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============== Body Parser & Logging ==============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('combined'));
app.use(requestLogger);

// ============== Rate Limiting ==============
app.use('/api/', rateLimiter);

// ============== Health Check ==============
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============== Root Welcome Route ==============
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SKLP Backend API Running Successfully 🚀"
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
