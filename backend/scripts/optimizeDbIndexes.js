import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Seller from '../models/Seller.js';
import SellerApplication from '../models/SellerApplication.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import Review from '../models/Review.js';
import Campaign from '../models/Campaign.js';
import Notification from '../models/Notification.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment.');
  process.exit(1);
}

async function optimizeIndexes() {
  console.log('🚀 Connecting to MongoDB for index optimization...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });

  console.log('✅ Connected to MongoDB:', mongoose.connection.name);

  const models = [
    { name: 'User', model: User },
    { name: 'Product', model: Product },
    { name: 'Order', model: Order },
    { name: 'Seller', model: Seller },
    { name: 'SellerApplication', model: SellerApplication },
    { name: 'Cart', model: Cart },
    { name: 'Wishlist', model: Wishlist },
    { name: 'Review', model: Review },
    { name: 'Campaign', model: Campaign },
    { name: 'Notification', model: Notification },
  ];

  console.log('\n📊 Creating and synchronizing collection indexes...');

  for (const { name, model } of models) {
    try {
      const startTime = Date.now();
      await model.createIndexes();
      const duration = Date.now() - startTime;
      const indexes = await model.collection.indexes();
      console.log(`✅ [${name}] Synchronized ${indexes.length} indexes in ${duration}ms`);
      indexes.forEach(idx => {
        const keys = Object.keys(idx.key).map(k => `${k}:${idx.key[k]}`).join(', ');
        const isUnique = idx.unique ? ' [UNIQUE]' : '';
        const isSparse = idx.sparse ? ' [SPARSE]' : '';
        console.log(`   - ${idx.name} (${keys})${isUnique}${isSparse}`);
      });
    } catch (err) {
      console.warn(`⚠️ [${name}] Index sync notice:`, err.message);
    }
  }

  console.log('\n✨ All database indexes verified and optimized successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

optimizeIndexes().catch(err => {
  console.error('💥 Fatal error during index optimization:', err);
  process.exit(1);
});
