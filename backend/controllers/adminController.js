import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import { ApiError } from '../middleware/errorHandler.js';
import { uploadMultipleImages, deleteImage } from '../config/cloudinary.js';

// ================= ENHANCED DASHBOARD =================
export const getDashboardMetrics = async (req, res) => {
  try {
    // 1. Core Summary Stats
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalOrders = await Order.countDocuments({});
    const totalProducts = await Product.countDocuments({ isActive: true });
    
    // Revenue Aggregation
    const salesStats = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'returned', 'refunded'] } } },
      { $group: { _id: null, totalSales: { $sum: '$totalAmount' }, avgOrder: { $avg: '$totalAmount' } } }
    ]);
    
    const totalSales = salesStats[0]?.totalSales || 0;
    const avgOrderValue = salesStats[0]?.avgOrder || 0;

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStart } });
    const todayRevenueAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ]);
    const todayRevenue = todayRevenueAgg[0]?.revenue || 0;

    // This week stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyNewUsers = await User.countDocuments({ createdAt: { $gte: weekStart } });
    const weeklyOrders = await Order.countDocuments({ createdAt: { $gte: weekStart } });
    const weeklyRevenueAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: weekStart }, status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ]);
    const weeklyRevenue = weeklyRevenueAgg[0]?.revenue || 0;

    // Previous week for growth calculation
    const prevWeekStart = new Date();
    prevWeekStart.setDate(prevWeekStart.getDate() - 14);
    const prevWeekRevenueAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: prevWeekStart, $lt: weekStart }, status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ]);
    const prevWeekRevenue = prevWeekRevenueAgg[0]?.revenue || 0;
    const weeklyGrowth = prevWeekRevenue > 0 
      ? Math.round(((weeklyRevenue - prevWeekRevenue) / prevWeekRevenue) * 100) 
      : 0;

    // Inventory alerts
    const lowStockCount = await Product.countDocuments({
      stock: { $gt: 0, $lte: 10 },
      isActive: true
    });
    const outOfStockCount = await Product.countDocuments({
      stock: 0,
      isActive: true
    });

    // Pending actions
    const pendingReturnsCount = await Order.countDocuments({ status: 'return_requested' });
    const pendingOrdersCount = await Order.countDocuments({ status: 'pending' });
    const pendingSellersCount = await User.countDocuments({ role: 'seller', 'sellerProfile.isVerified': false });

    // Order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Category Sales
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

    // Monthly Sales Timeline (Last 30 days)
    const salesTimeline = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 }
    ]);

    // Recent Orders
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'firstName lastName email')
      .lean();

    // Conversion rate (orders / unique users who visited in last 30 days)
    const conversionRate = totalUsers > 0 ? Math.round((totalOrders / totalUsers) * 100) : 0;

    res.status(200).json({
      success: true,
      metrics: {
        // Core
        totalUsers,
        totalSellers,
        totalOrders,
        totalProducts,
        totalSales,
        avgOrderValue: Math.round(avgOrderValue),
        // Today
        todayOrders,
        todayRevenue,
        // Weekly
        weeklyNewUsers,
        weeklyOrders,
        weeklyRevenue,
        weeklyGrowth,
        // Inventory
        lowStockCount,
        outOfStockCount,
        // Pending actions
        pendingReturnsCount,
        pendingOrdersCount,
        pendingSellersCount,
        // Calculated
        conversionRate,
        // Breakdowns
        orderStatusBreakdown: orderStatusBreakdown.map(s => ({ status: s._id, count: s.count })),
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
          orderNumber: o.orderNumber,
          customer: o.userId ? `${o.userId.firstName} ${o.userId.lastName}` : 'Guest Customer',
          email: o.userId?.email,
          total: o.totalAmount,
          status: o.status,
          paymentMethod: o.paymentMethod,
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
export const getAllProducts = async (req, res) => {
  const { category, search, status, page = 1, limit = 20 } = req.query;
  const query = {};

  if (category) query.category = category;
  if (status === 'active') query.isActive = true;
  else if (status === 'inactive') query.isActive = false;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } }
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

// Create product with image upload support
export const createProduct = async (req, res) => {
  const {
    name, description, shortDescription, category, subcategory, gender,
    price, originalPrice, discount, stock, lowStockThreshold,
    images, variants, attributes, brand, tags
  } = req.body;

  // Generate unique SKU
  const categoryPrefix = (category || 'GEN').substring(0, 3).toUpperCase();
  const genderPrefix = (gender || 'UNI').substring(0, 1).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const sku = `${categoryPrefix}-${genderPrefix}-${randomSuffix}`;

  // Process images from multer file uploads
  let processedImages = [];
  if (req.files && req.files.length > 0) {
    const uploaded = await uploadMultipleImages(
      req.files.map(f => f.buffer),
      { folder: 'products', width: 1200 }
    );
    processedImages = uploaded.map((img, i) => ({
      url: img.url,
      publicId: img.publicId,
      isMain: i === 0,
      alt: name,
    }));
  } else if (images && images.length > 0) {
    // Images passed as URL array in body
    processedImages = images;
  }

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
    brand,
    images: processedImages,
    variants: variants || [],
    attributes: attributes || {},
    tags: tags || [],
    isActive: true,
    moderationStatus: 'approved',
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

  // Handle new image uploads
  if (req.files && req.files.length > 0) {
    const uploaded = await uploadMultipleImages(
      req.files.map(f => f.buffer),
      { folder: 'products', width: 1200 }
    );
    const newImages = uploaded.map(img => ({
      url: img.url,
      publicId: img.publicId,
      isMain: false,
      alt: product.name,
    }));
    product.images = [...(product.images || []), ...newImages];
  }

  // Update fields dynamically
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined && key !== 'images') {
      product[key] = req.body[key];
    }
  });

  // If images array explicitly provided (for reorder/delete)
  if (req.body.images && !req.files?.length) {
    product.images = req.body.images;
  }

  product.updatedBy = req.user.id;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    product
  });
};

// Delete Product (Soft delete)
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  product.isActive = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product deactivated successfully'
  });
};

// ================= BULK OPERATIONS =================
export const bulkUpdateProducts = async (req, res) => {
  const { productIds, action } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    throw new ApiError(400, 'Product IDs array is required');
  }

  let updateData = {};
  let message = '';

  switch (action) {
    case 'activate':
      updateData = { isActive: true };
      message = `${productIds.length} product(s) activated`;
      break;
    case 'deactivate':
      updateData = { isActive: false };
      message = `${productIds.length} product(s) deactivated`;
      break;
    case 'feature':
      updateData = { isFeatured: true };
      message = `${productIds.length} product(s) marked as featured`;
      break;
    case 'unfeature':
      updateData = { isFeatured: false };
      message = `${productIds.length} product(s) unfeatured`;
      break;
    case 'approve':
      updateData = { moderationStatus: 'approved' };
      message = `${productIds.length} product(s) approved`;
      break;
    default:
      throw new ApiError(400, `Unknown action: ${action}`);
  }

  await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: { ...updateData, updatedBy: req.user.id } }
  );

  res.status(200).json({ success: true, message });
};

// ================= ORDER WORKFLOW =================
export const getAllOrders = async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const query = {};

  if (status) query.status = status;
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
    ];
  }

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

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status,
    updatedAt: new Date(),
    comment: `Status updated by Admin ID: ${req.user.id}`
  });

  await order.save();

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
export const getAllUsers = async (req, res) => {
  const { role, search, status, page = 1, limit = 20 } = req.query;
  const query = {};

  if (role) query.role = role;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    users: users.map(u => {
      const userObj = { ...u };
      delete userObj.password;
      delete userObj.refreshTokens;
      return userObj;
    }),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
};

export const changeUserRole = async (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (role) {
    user.role = role;
    // Initialize seller profile if promoting to seller
    if (role === 'seller' && !user.sellerProfile?.storeName) {
      user.sellerProfile = {
        storeName: `${user.firstName}'s Store`,
        isVerified: false,
      };
    }
  }
  if (status) user.status = status;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User account settings updated successfully',
    user: user.toJSON()
  });
};

// ================= SELLER MANAGEMENT =================
export const getAllSellers = async (req, res) => {
  const { verified, search } = req.query;
  const query = { role: 'seller' };

  if (verified === 'true') query['sellerProfile.isVerified'] = true;
  else if (verified === 'false') query['sellerProfile.isVerified'] = false;

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'sellerProfile.storeName': { $regex: search, $options: 'i' } }
    ];
  }

  const sellers = await User.find(query)
    .sort({ createdAt: -1 })
    .lean();

  // Get product counts for each seller
  const sellerData = await Promise.all(sellers.map(async (seller) => {
    const productCount = await Product.countDocuments({ createdBy: seller._id });
    return {
      _id: seller._id,
      firstName: seller.firstName,
      lastName: seller.lastName,
      email: seller.email,
      phone: seller.phone,
      status: seller.status,
      sellerProfile: seller.sellerProfile,
      productCount,
      createdAt: seller.createdAt,
    };
  }));

  res.status(200).json({ success: true, sellers: sellerData });
};

export const verifySeller = async (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body; // 'verify' or 'reject'

  const seller = await User.findById(id);
  if (!seller || seller.role !== 'seller') {
    throw new ApiError(404, 'Seller not found');
  }

  if (action === 'verify') {
    seller.sellerProfile.isVerified = true;
    seller.sellerProfile.verifiedAt = new Date();
  } else if (action === 'reject') {
    seller.sellerProfile.isVerified = false;
  }

  await seller.save();

  await Notification.create({
    userId: seller._id,
    type: 'system',
    title: `Seller Account ${action === 'verify' ? 'Verified' : 'Rejected'}`,
    message: action === 'verify'
      ? 'Congratulations! Your seller account has been verified. You can now list products.'
      : `Your seller verification was rejected. ${notes || 'Please contact support.'}`,
  });

  res.status(200).json({
    success: true,
    message: `Seller ${action === 'verify' ? 'verified' : 'rejected'} successfully`
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
    endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

  coupon.isActive = false;
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
  const { action, adminNotes } = req.body;

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
    order.status = 'delivered';
  }

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: order.status,
    updatedAt: new Date(),
    comment: `Return request ${action}d. Notes: ${adminNotes || ''}`
  });

  await order.save();

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
    endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
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
