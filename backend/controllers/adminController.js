import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import SellerSettlement from '../models/SellerSettlement.js';
import { ApiError } from '../middleware/errorHandler.js';
import { uploadMultipleImages } from '../config/cloudinary.js';
import {
  broadcastNotification,
  notifyOrderStatusChanged,
  notifySellerVerification,
  notifyReturnStatusChanged
} from '../services/notificationService.js';

// ================= ENHANCED DASHBOARD =================
export const getDashboardMetrics = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const prevWeekStart = new Date();
    prevWeekStart.setDate(prevWeekStart.getDate() - 14);

    // ── Run ALL queries in parallel for maximum speed ──────────────────
    const [
      totalUsers,
      totalSellers,
      totalOrders,
      totalProducts,
      salesStats,
      todayOrders,
      todayRevenueAgg,
      weeklyNewUsers,
      weeklyOrders,
      weeklyRevenueAgg,
      prevWeekRevenueAgg,
      lowStockCount,
      outOfStockCount,
      pendingReturnsCount,
      pendingOrdersCount,
      pendingSellersCount,
      orderStatusBreakdown,
      categorySales,
      salesTimeline,
      recentOrders
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'seller' }),
      Order.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([
        { $match: { status: { $nin: ['cancelled', 'returned', 'refunded'] } } },
        { $group: { _id: null, totalSales: { $sum: '$totalAmount' }, avgOrder: { $avg: '$totalAmount' } } }
      ]),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
      ]),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      Order.countDocuments({ createdAt: { $gte: weekStart } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: weekStart }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: prevWeekStart, $lt: weekStart }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
      ]),
      Product.countDocuments({ stock: { $gt: 0, $lte: 10 }, isActive: true }),
      Product.countDocuments({ stock: 0, isActive: true }),
      Order.countDocuments({ status: 'return_requested' }),
      Order.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'seller', 'sellerProfile.isVerified': false }),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Order.aggregate([
        { $match: { status: { $nin: ['cancelled'] } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', qty: { $sum: '$items.quantity' }, amount: { $sum: '$items.finalPrice' } } },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
        { $unwind: '$productInfo' },
        { $group: { _id: '$productInfo.category', totalQuantity: { $sum: '$qty' }, totalSales: { $sum: '$amount' } } },
        { $sort: { totalSales: -1 } }
      ]),
      Order.aggregate([
        { $match: { status: { $nin: ['cancelled'] } } },
        { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 30 }
      ]),
      Order.find({}).sort({ createdAt: -1 }).limit(10).populate('userId', 'firstName lastName email').lean()
    ]);

    const totalSales = salesStats[0]?.totalSales || 0;
    const avgOrderValue = salesStats[0]?.avgOrder || 0;
    const todayRevenue = todayRevenueAgg[0]?.revenue || 0;
    const weeklyRevenue = weeklyRevenueAgg[0]?.revenue || 0;
    const prevWeekRevenue = prevWeekRevenueAgg[0]?.revenue || 0;
    const weeklyGrowth = prevWeekRevenue > 0
      ? Math.round(((weeklyRevenue - prevWeekRevenue) / prevWeekRevenue) * 100)
      : 0;
    const conversionRate = totalUsers > 0 ? Math.round((totalOrders / totalUsers) * 100) : 0;

    res.status(200).json({
      success: true,
      metrics: {
        totalUsers, totalSellers, totalOrders, totalProducts, totalSales,
        avgOrderValue: Math.round(avgOrderValue),
        todayOrders, todayRevenue,
        weeklyNewUsers, weeklyOrders, weeklyRevenue, weeklyGrowth,
        lowStockCount, outOfStockCount,
        pendingReturnsCount, pendingOrdersCount, pendingSellersCount,
        conversionRate,
        orderStatusBreakdown: orderStatusBreakdown.map(s => ({ status: s._id, count: s.count })),
        categorySales: categorySales.map(c => ({ category: c._id, quantity: c.totalQuantity, sales: c.totalSales })),
        salesTimeline: salesTimeline.map(s => ({
          date: `${s._id.year}-${String(s._id.month).padStart(2, '0')}-${String(s._id.day).padStart(2, '0')}`,
          revenue: s.revenue, orderCount: s.count
        })),
        recentOrders: recentOrders.map(o => ({
          id: o._id, orderNumber: o.orderNumber,
          customer: o.userId ? `${o.userId.firstName} ${o.userId.lastName}` : 'Guest Customer',
          email: o.userId?.email, total: o.totalAmount, status: o.status,
          paymentMethod: o.paymentMethod, date: o.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Metrics Error:', error);
    res.status(500).json({ success: false, message: 'Could not load metrics dashboard', error: error.message });
  }
};



export const getDashboardStats = getDashboardMetrics;

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
    images, variants, attributes, brand, tags, sellerId
  } = req.body;

  // Generate unique SKU
  const categoryPrefix = (category || 'GEN').substring(0, 3).toUpperCase();
  const genderPrefix = (gender || 'UNI').substring(0, 1).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const sku = `${categoryPrefix}-${genderPrefix}-${randomSuffix}`;

  const assignedBrand = (brand || 'STYLE STREET').trim();
  const brandNormalized = assignedBrand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameNormalized = (name || '').toLowerCase().trim();

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
    nameNormalized,
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
    brand: assignedBrand,
    brandNormalized,
    sellerId: sellerId || undefined,
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

  // Keep normalized fields in sync
  if (req.body.name) {
    product.nameNormalized = req.body.name.toLowerCase().trim();
  }
  if (req.body.brand) {
    product.brandNormalized = req.body.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

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

  if (status && status !== 'all') query.status = status;

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    const matchingUsers = await User.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
    }).select('_id').lean();

    const matchedUserIds = matchingUsers.map(u => u._id);

    query.$or = [
      { orderNumber: searchRegex },
      ...(matchedUserIds.length > 0 ? [{ userId: { $in: matchedUserIds } }] : [])
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('userId', 'firstName lastName email phone')
      .lean(),
    Order.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    orders,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1
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

  // Trigger push + in-app notification via centralized service
  try {
    await notifyOrderStatusChanged(order, status, trackingDetails);
  } catch (notifErr) {
    console.warn('[ADMIN CONTROLLER] Order status notification error:', notifErr.message);
  }

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

  if (role && role !== 'all') query.role = role;
  if (status && status !== 'all') query.status = status;
  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { customUserId: searchRegex }
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query)
  ]);

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
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1
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

export const createUserByAdmin = async (req, res) => {
  const { firstName, lastName, email, phone, password, role, status } = req.body;

  if (!email && !phone) {
    throw new ApiError(400, 'Either email or phone is required');
  }

  const existing = await User.findOne({
    $or: [
      ...(email ? [{ email: email.toLowerCase() }] : []),
      ...(phone ? [{ phone }] : [])
    ]
  });

  if (existing) {
    throw new ApiError(409, 'A user with this email or phone already exists');
  }

  const validRole = ['customer', 'admin', 'seller', 'delivery'].includes(role) ? role : 'customer';

  const user = new User({
    firstName: firstName || 'User',
    lastName: lastName || '',
    email: email ? email.toLowerCase() : undefined,
    phone: phone || undefined,
    password: password || 'Sklp@12345',
    role: validRole,
    status: status || 'active',
    isEmailVerified: !!email,
    isPhoneVerified: !!phone,
    sellerProfile: validRole === 'seller' ? {
      storeName: `${firstName || 'User'}'s Store`,
      isVerified: true,
      verifiedAt: new Date()
    } : undefined
  });

  await user.save();

  res.status(201).json({
    success: true,
    message: `${validRole.toUpperCase()} account created successfully`,
    user: user.toJSON()
  });
};

export const deleteUserByAdmin = async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    throw new ApiError(400, 'You cannot delete your own admin account');
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    message: 'User account deleted permanently'
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

  // Send push + in-app notification to seller
  try {
    await notifySellerVerification(seller, action, notes);
  } catch (notifErr) {
    console.warn('[ADMIN CONTROLLER] Seller verification notification error:', notifErr.message);
  }

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

    // Cancel settlements for returned order items
    await SellerSettlement.updateMany(
      { orderId: order._id, status: { $in: ['PENDING', 'AVAILABLE'] } },
      { $set: { status: 'CANCELLED', adjustmentReason: `Return approved by admin: ${adminNotes || ''}` } }
    );
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

  // Send push + in-app notification to customer
  try {
    await notifyReturnStatusChanged(order, action, adminNotes);
  } catch (notifErr) {
    console.warn('[ADMIN CONTROLLER] Return status notification error:', notifErr.message);
  }

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
  const { page = 1, limit = 20, type, search, scope = 'all' } = req.query;
  const query = {};

  if (scope === 'personal') {
    query.userId = req.user.id;
  } else if (scope === 'users') {
    query.userId = { $ne: req.user.id };
  }

  if (type && type !== 'all') {
    query.type = type;
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    query.$or = [
      { title: searchRegex },
      { message: searchRegex }
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate('userId', 'firstName lastName email role phone')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ ...query, isRead: false })
  ]);

  res.status(200).json({
    success: true,
    notifications,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1
    },
    unreadCount
  });
};

export const createNotification = async (req, res) => {
  const {
    userId,
    targetRole = 'all',
    userIds,
    type = 'system',
    title,
    message,
    actionUrl,
    imageUrl
  } = req.body;

  if (!title || !message) {
    throw new ApiError(400, 'Notification title and message are required');
  }

  // Handle targeting parameters
  let effectiveUserIds = Array.isArray(userIds) && userIds.length > 0 ? userIds : null;
  let effectiveRole = targetRole;

  if (userId && userId !== 'all') {
    effectiveUserIds = [userId];
  } else if (userId === 'all') {
    effectiveRole = 'customer';
  }

  const result = await broadcastNotification({
    targetRole: effectiveRole,
    userIds: effectiveUserIds,
    type: type || 'system',
    title,
    message,
    actionUrl: actionUrl || '/',
    imageUrl: imageUrl || null
  });

  res.status(201).json({
    success: true,
    message: result.message || `Notifications broadcasted successfully to ${result.count} users`,
    result
  });
};

export const deleteNotification = async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findByIdAndDelete(id);

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully'
  });
};

export const getNotificationStats = async (req, res) => {
  const [
    totalCount,
    unreadCount,
    pushReadyUsers,
    typeBreakdown
  ] = await Promise.all([
    Notification.countDocuments({}),
    Notification.countDocuments({ isRead: false }),
    User.countDocuments({ fcmTokens: { $exists: true, $ne: [] } }),
    Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalCount,
      unreadCount,
      pushReadyUsers,
      types: (typeBreakdown || []).map(t => ({ type: t._id, count: t.count }))
    }
  });
};

// ================= REVIEW MODERATION =================
export const getAdminReviews = async (req, res) => {
  const { status, rating, productId, search, page = 1, limit = 20 } = req.query;
  const query = {};

  if (status && ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'].includes(status.toUpperCase())) {
    query.status = status.toUpperCase();
  }
  if (rating) query.rating = Number(rating);
  if (productId) query.productId = productId;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { comment: { $regex: search, $options: 'i' } },
      { reviewerName: { $regex: search, $options: 'i' } }
    ];
  }

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('productId', 'name brand images price')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    reviews,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
};

export const updateReviewModerationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, moderationNotes } = req.body;

  if (!status || !['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'].includes(status.toUpperCase())) {
    throw new ApiError(400, 'Invalid moderation status. Must be PENDING, APPROVED, REJECTED, or HIDDEN');
  }

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  review.status = status.toUpperCase();
  if (moderationNotes) review.moderationNotes = moderationNotes;
  review.moderatedBy = req.user.id;
  review.moderatedAt = new Date();
  await review.save();

  // Dynamically recalculate the product rating
  const { recalculateProductRating } = await import('./reviewController.js');
  await recalculateProductRating(review.productId);

  res.status(200).json({
    success: true,
    message: `Review status updated to ${review.status}`,
    review
  });
};

