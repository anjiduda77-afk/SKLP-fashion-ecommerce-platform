import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import { ApiError } from '../middleware/errorHandler.js';

// Get Dashboard Metrics
export const getDashboardMetrics = async (req, res) => {
  try {
    // 1. Core Summary Stats
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalOrders = await Order.countDocuments({});
    
    // Aggregation for Total Revenue
    const salesStats = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'returned', 'refunded'] } } },
      { $group: { _id: null, totalSales: { $sum: '$total' }, avgOrder: { $avg: '$total' } } }
    ]);
    
    const totalSales = salesStats[0]?.totalSales || 0;
    const avgOrderValue = salesStats[0]?.avgOrder || 0;

    // 2. Inventory Alert count (low stock items)
    const lowStockCount = await Product.countDocuments({
      stock: { $lte: 10 }, // standard threshold
      isActive: true
    });

    // 3. Return Requests Count
    const pendingReturnsCount = await Order.countDocuments({
      status: 'return_requested'
    });

    // 4. Category Sales (Aggregation)
    const categorySales = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          qty: { $sum: '$items.quantity' },
          amount: { $sum: '$items.finalPrice' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$productInfo.category',
          totalQuantity: { $sum: '$qty' },
          totalSales: { $sum: '$amount' }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    // 5. Monthly Sales Timeline (Aggregation)
    const salesTimeline = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 } // Last 30 days
    ]);

    // 6. Recent Orders
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName email')
      .lean();

    res.status(200).json({
      success: true,
      metrics: {
        totalUsers,
        totalOrders,
        totalSales,
        avgOrderValue,
        lowStockCount,
        pendingReturnsCount,
        categorySales: categorySales.map(c => ({
          category: c._id,
          quantity: c.totalQuantity,
          sales: c.totalSales
        })),
        salesTimeline: salesTimeline.map(s => ({
          date: `${s._id.year}-${String(s._id.month).padStart(2, '0')}-${String(s._id.day).padStart(2, '0')}`,
          revenue: s.revenue,
          orderCount: s.count
        })),
        recentOrders: recentOrders.map(o => ({
          id: o._id,
          customer: o.userId ? `${o.userId.firstName} ${o.userId.lastName}` : 'Guest Customer',
          total: o.total,
          status: o.status,
          date: o.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Metrics Error:', error);
    res.status(500).json({ success: false, message: 'Could not load metrics dashboard', error: error.message });
  }
};

// ================= PRODUCT CRUD =================
// Get all products (Admin View with full filter)
export const getAllProducts = async (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;
  const query = {};

  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }

  const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    products,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
};

// Create new Product
export const createProduct = async (req, res) => {
  const { name, description, shortDescription, category, subcategory, gender, price, originalPrice, discount, stock, lowStockThreshold, images, variants, attributes } = req.body;

  // Generate unique SKU
  const categoryPrefix = (category || 'GEN').substring(0, 3).toUpperCase();
  const genderPrefix = (gender || 'UNI').substring(0, 1).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const sku = `${categoryPrefix}-${genderPrefix}-${randomSuffix}`;

  const product = await Product.create({
    name,
    description,
    shortDescription,
    category,
    subcategory,
    gender,
    price,
    originalPrice: originalPrice || price,
    discount: discount || 0,
    stock,
    lowStockThreshold: lowStockThreshold || 10,
    sku,
    images: images || [],
    variants: variants || [],
    attributes: attributes || {},
    isActive: true,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    product
  });
};

// Update Product
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Update fields dynamically
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) {
      product[key] = req.body[key];
    }
  });

  product.updatedBy = req.user.id;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    product
  });
};

// Delete Product (Soft delete by default to preserve order history)
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Soft delete
  product.isActive = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product deactivated successfully'
  });
};

// ================= ORDER WORKFLOW =================
// Get all orders with details
export const getAllOrders = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};

  if (status) query.status = status;

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('userId', 'firstName lastName email')
    .lean();

  const total = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    orders,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
};

// Update order delivery status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, trackingDetails } = req.body;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.status = status;
  if (trackingDetails) {
    order.trackingDetails = { ...order.trackingDetails, ...trackingDetails };
  }

  // Track status updates in history logs
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status,
    updatedAt: new Date(),
    comment: `Status updated by Admin ID: ${req.user.id}`
  });

  await order.save();

  // Trigger system notification
  await Notification.create({
    userId: order.userId,
    type: 'order',
    title: `Order Status: ${status.toUpperCase()}`,
    message: `Your order #${order._id.toString().substring(18)} status has been updated to: ${status}.`,
    relatedEntity: { entityType: 'order', entityId: order._id }
  });

  res.status(200).json({
    success: true,
    message: `Order status updated to ${status}`,
    order
  });
};

// Get order by ID
export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'firstName lastName email phone')
    .lean();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.status(200).json({
    success: true,
    order
  });
};

// ================= USER ACCOUNTS =================
// Get all users
export const getAllUsers = async (req, res) => {
  const { role, search } = req.query;
  const query = {};

  if (role) query.role = role;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query).sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    users: users.map(u => {
      const userObj = { ...u };
      delete userObj.password;
      return userObj;
    })
  });
};

// Change user roles (Promote or suspend accounts)
export const changeUserRole = async (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (role) user.role = role;
  if (status) user.status = status;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User account settings updated successfully',
    user: user.toJSON()
  });
};

// ================= COUPONS CRUD =================
export const getCoupons = async (req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, coupons });
};

export const createCoupon = async (req, res) => {
  const { code, description, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, startDate, endDate, maxUses } = req.body;

  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) {
    throw new ApiError(409, 'Coupon code already exists');
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    description,
    discountType,
    discountValue,
    minPurchaseAmount: minPurchaseAmount || 0,
    maxDiscountAmount: maxDiscountAmount || null,
    startDate: startDate || new Date(),
    endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    maxUses: maxUses || null,
    isActive: true,
    createdBy: req.user.id
  });

  res.status(201).json({ success: true, message: 'Coupon created successfully', coupon });
};

export const updateCoupon = async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }

  Object.assign(coupon, req.body);
  coupon.updatedBy = req.user.id;
  await coupon.save();

  res.status(200).json({ success: true, message: 'Coupon updated successfully', coupon });
};

export const deleteCoupon = async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }

  coupon.isActive = false; // soft delete
  await coupon.save();

  res.status(200).json({ success: true, message: 'Coupon deactivated successfully' });
};

// ================= RETURNS/REFUNDS =================
export const getReturnRequests = async (req, res) => {
  const orders = await Order.find({ status: 'return_requested' })
    .populate('userId', 'firstName lastName email')
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({ success: true, returns: orders });
};

export const updateReturnStatus = async (req, res) => {
  const { id } = req.params;
  const { action, adminNotes } = req.body; // 'approve' or 'reject'

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (action === 'approve') {
    order.status = 'returned';
    order.paymentDetails = order.paymentDetails || {};
    order.paymentDetails.refundStatus = 'refunded';
    order.paymentDetails.refundedAt = new Date();
  } else {
    order.status = 'delivered'; // revert to original state
  }

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: order.status,
    updatedAt: new Date(),
    comment: `Return request ${action}d. Notes: ${adminNotes || ''}`
  });

  await order.save();

  // Send Notification
  await Notification.create({
    userId: order.userId,
    type: 'return',
    title: `Return Request: ${action.toUpperCase()}`,
    message: `Your return request for order #${order._id.toString().substring(18)} has been ${action}d. ${adminNotes || ''}`,
    relatedEntity: { entityType: 'order', entityId: order._id }
  });

  res.status(200).json({ success: true, message: `Return request has been ${action}d`, order });
};

// ================= BANNERS CRUD =================
export const getBanners = async (req, res) => {
  const banners = await Banner.find({}).sort({ displayOrder: 1 }).lean();
  res.status(200).json({ success: true, banners });
};

export const createBanner = async (req, res) => {
  const { title, description, image, mobileImage, type, link, linkType, cta, position, displayOrder, startDate, endDate } = req.body;

  const banner = await Banner.create({
    title,
    description,
    image: { url: image?.url || 'https://via.placeholder.com/1200x500', alt: title },
    mobileImage: { url: mobileImage?.url || image?.url },
    type: type || 'hero',
    link,
    linkType: linkType || 'none',
    cta: cta || { text: 'Shop Now', style: 'primary' },
    position: position || 'home-hero',
    displayOrder: displayOrder || 0,
    startDate: startDate || new Date(),
    endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
    isActive: true,
    createdBy: req.user.id
  });

  res.status(201).json({ success: true, message: 'Banner created successfully', banner });
};

export const updateBanner = async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  Object.assign(banner, req.body);
  banner.updatedBy = req.user.id;
  await banner.save();

  res.status(200).json({ success: true, message: 'Banner updated successfully', banner });
};

export const deleteBanner = async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  await Banner.findByIdAndDelete(id);
  res.status(200).json({ success: true, message: 'Banner deleted successfully' });
};

// ================= NOTIFICATIONS =================
export const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.status(200).json({ success: true, notifications });
};

export const createNotification = async (req, res) => {
  const { userId, type, title, message, actionUrl } = req.body;

  let targetUsers = [];
  if (userId === 'all') {
    const customers = await User.find({ role: 'customer' }).select('_id');
    targetUsers = customers.map(c => c._id);
  } else {
    targetUsers = [userId];
  }

  const notifications = await Promise.all(
    targetUsers.map(uId =>
      Notification.create({
        userId: uId,
        type: type || 'system',
        title,
        message,
        actionUrl,
        channels: { inApp: true }
      })
    )
  );

  res.status(201).json({
    success: true,
    message: `Notifications sent to ${targetUsers.length} users`,
    count: notifications.length
  });
};
