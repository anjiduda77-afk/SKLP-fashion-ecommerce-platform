import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

const uri = process.env.MONGODB_URI;
console.log('Connecting to:', uri ? uri.replace(/:[^@]+@/, ':***@') : 'undefined');

mongoose.connect(uri)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });
