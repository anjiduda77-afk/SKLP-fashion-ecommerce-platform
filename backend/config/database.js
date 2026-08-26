import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 3000; // 3 seconds

let dbError = null;

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    dbError = 'MONGODB_URI is not defined in environment variables';
    console.error(`❌ ${dbError}`);
    console.error('   Please configure MONGODB_URI in Render dashboard / .env file');
    return null;
  }

  if (mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    dbError = 'MONGODB_URI contains unpopulated placeholders (<username> or <password>)';
    console.error(`❌ ${dbError}`);
    return null;
  }

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    retryWrites: true,
    w: 'majority',
    family: 4, // Prefer IPv4 for Render & Cloud DB compatibility
    autoIndex: process.env.NODE_ENV !== 'production' // Skip index build in production for instant boot
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const connection = await mongoose.connect(mongoUri, options);
      dbError = null;
      console.log(`✅ MongoDB connected successfully: ${connection.connection.host}`);
      return connection;
    } catch (error) {
      dbError = error.message;
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);

      if (attempt === MAX_RETRIES) {
        console.error('❌ All MongoDB connection attempts exhausted. Server will continue running in degraded mode.');
        console.error('   Fix your MongoDB Atlas IP Access List (whitelist 0.0.0.0/0) or check network credentials.');
        return null;
      }

      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      console.log(`   Retrying connection in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Returns current MongoDB connection health state
 */
export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'unknown',
    isConnected: stateCode === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    error: stateCode === 1 ? null : (dbError || 'Database not connected')
  };
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

export default connectDB;
