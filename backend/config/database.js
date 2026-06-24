import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 3000; // 3 seconds

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const connection = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        retryWrites: true,
        w: 'majority',
      });

      console.log(`✅ MongoDB connected: ${connection.connection.host}`);
      return connection;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);

      if (attempt === MAX_RETRIES) {
        console.error('❌ All MongoDB connection attempts exhausted. Server will continue running without DB.');
        console.error('   Fix your MongoDB Atlas IP whitelist or network, then restart the server.');
        // Don't crash — let the server stay up so it can serve health checks
        // and reconnect automatically when MongoDB becomes available
        return null;
      }

      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      console.log(`   Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

export default connectDB;
