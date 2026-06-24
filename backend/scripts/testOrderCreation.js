import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
dotenv.config();

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test customer user and a product
    const user = await User.findOne({ role: 'customer' });
    const product = await Product.findOne();

    if (!user || !product) {
      console.error('❌ Could not find a test customer or product. Run db seeder first.');
      process.exit(1);
    }

    console.log(`Using User: ${user.email} (${user._id})`);
    console.log(`Using Product: ${product.name} (${product._id})`);

    // Attempt to create a dummy order mimicking orderController.js
    const dummyOrder = {
      userId: user._id,
      items: [
        {
          productId: product._id,
          quantity: 1,
          unitPrice: product.price, // note: orderController uses unitPrice
          discount: product.discount || 0,
          variant: { size: 'M', color: 'Black' },
          finalPrice: product.price - (product.price * (product.discount || 0) / 100),
          productName: product.name,
          images: product.images,
        }
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'Test Country',
      },
      paymentMethod: 'cod',
      couponDiscount: 0,
      discountAmount: 0,
      subtotal: product.price,
      total: product.price,
      totalAmount: product.price,
      status: 'pending',
      phone: '9876543210',
      statusTimeline: [{ status: 'pending', timestamp: new Date(), notes: 'Order placed successfully' }],
      statusHistory: [{ status: 'pending', updatedAt: new Date(), comment: 'Order placed successfully' }],
    };

    console.log('Attempting Order.create()...');
    const createdOrder = await Order.create(dummyOrder);
    console.log('✅ Order created successfully!', createdOrder._id);
    
    // Cleanup
    await Order.findByIdAndDelete(createdOrder._id);
    console.log('🧹 Cleaned up test order');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Order creation failed with error:', error);
    process.exit(1);
  }
};

runTest();
