import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { cancelOrder } from '../controllers/orderController.js';
dotenv.config();

const testCancel = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const user = await User.findOne({ role: 'customer' });
    const order = await Order.findOne({ userId: user._id });

    if (!order) {
      console.log('No order found.');
      process.exit(1);
    }

    console.log('Testing cancel on order:', order._id, 'current status:', order.status);

    const req = {
      params: { id: order._id.toString() },
      user: { id: user._id.toString(), role: 'customer' }
    };

    const res = {
      statusCode: 200,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };

    await cancelOrder(req, res);
    console.log('Response status:', res.statusCode);
    console.log('Response data:', JSON.stringify(res.data, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Cancellation test failed:', error);
    process.exit(1);
  }
};

testCancel();
