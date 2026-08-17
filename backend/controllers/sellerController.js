import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import SellerOffer from '../models/SellerOffer.js';
import SellerSettlement from '../models/SellerSettlement.js';
import Subscription from '../models/Subscription.js';
import { ApiError } from '../middleware/errorHandler.js';
import { uploadMultipleImages, deleteImage } from '../config/cloudinary.js';

// ================= SELLER DASHBOARD =================
export const getSellerDashboard = async (req, res) => {
  const userId = req.user.id;
  let seller = await Seller.findOne({ userId });

  if (!seller) {
    // Auto-create seller profile if user has seller role (backward compatibility)
    const user = await User.findById(userId);
    const shopName = user?.sellerProfile?.storeName || `${user?.firstName || 'Seller'}'s Store`;
    const shopSlug = shopName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    seller = await Seller.create({
      userId,
      shopName,
      shopSlug: `${shopSlug}-${Date.now().toString().slice(-4)}`,
      verificationStatus: 'verified',
      sellerStatus: 'active'
    });
  }

  // 1. Products & Offers
  const totalProducts = await Product.countDocuments({ createdBy: userId, isActive: true });
  const totalOffers = await SellerOffer.countDocuments({ sellerId: seller._id, isActive: true });
  const outOfStock = await Product.countDocuments({ createdBy: userId, isActive: true, stock: 0 });

  // 2. Orders & Suborders
  const orders = await Order.find({
    'sellerSuborders.sellerId': seller._id
  }).sort({ createdAt: -1 }).lean();

  let totalSales = 0;
  let totalPlatformCommission = 0;
  let totalSellerEarnings = 0;
  let pendingOrders = 0;
  let dispatchedOrders = 0;
  let deliveredOrders = 0;

  orders.forEach(order => {
    const mySuborders = (order.sellerSuborders || []).filter(
      sub => sub.sellerId?.toString() === seller._id.toString()
    );

    mySuborders.forEach(sub => {
      totalSales += sub.subtotal || 0;
      totalPlatformCommission += sub.platformCommission || 0;
      totalSellerEarnings += sub.sellerPayout || 0;

      if (sub.status === 'pending' || sub.status === 'confirmed') pendingOrders++;
      else if (sub.status === 'packed' || sub.status === 'shipped') dispatchedOrders++;
      else if (sub.status === 'delivered') deliveredOrders++;
    });
  });

  // 3. Settlements Summary
  const settlements = await SellerSettlement.find({ sellerId: seller._id }).lean();
  const pendingSettlement = settlements
    .filter(s => s.status === 'PENDING')
    .reduce((sum, s) => sum + s.sellerPayout, 0);
  const availableSettlement = settlements
    .filter(s => s.status === 'AVAILABLE')
    .reduce((sum, s) => sum + s.sellerPayout, 0);
  const paidSettlement = settlements
    .filter(s => s.status === 'PAID')
    .reduce((sum, s) => sum + s.sellerPayout, 0);

  // 4. Subscription Status
  const subscription = await Subscription.findOne({ sellerId: seller._id }).lean();

  res.status(200).json({
    success: true,
    dashboard: {
      metrics: {
        totalProducts: totalProducts + totalOffers,
        totalOrders: orders.length,
        pendingOrders,
        dispatchedOrders,
        deliveredOrders,
        totalSales,
        platformCommission: totalPlatformCommission,
        totalEarnings: totalSellerEarnings,
        pendingSettlement,
        availableSettlement,
        paidSettlement,
        outOfStockProducts: outOfStock,
      },
      seller: {
        _id: seller._id,
        shopName: seller.shopName,
        shopSlug: seller.shopSlug,
        rating: seller.rating,
        reviewCount: seller.reviewCount,
        verificationStatus: seller.verificationStatus,
        sellerStatus: seller.sellerStatus,
        currentPlan: seller.currentPlan,
        trialEndsAt: seller.trialEndsAt
      },
      subscription: subscription || {
        plan: 'trial',
        status: 'TRIAL',
        trialEndDate: seller.trialEndsAt
      }
    }
  });
};

// ================= SELLER PRODUCTS =================
// Get seller's own products
export const getSellerProducts = async (req, res) => {
  const { page = 1, limit = 20, search, category, status } = req.query;
  const query = { createdBy: req.user.id };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }
  if (category) query.category = category;
  if (status === 'active') query.isActive = true;
  else if (status === 'inactive') query.isActive = false;

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
export const createSellerProduct = async (req, res) => {
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

  // Process images: if files uploaded via multer, upload to Cloudinary
  let processedImages = images || [];
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
    moderationStatus: 'pending',
    createdBy: req.user.id
  });

  // Update seller's product count
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { 'sellerProfile.totalProducts': 1 }
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully. It will be visible after admin approval.',
    product
  });
};

// Update seller's own product
export const updateSellerProduct = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findOne({ _id: id, createdBy: req.user.id });
  if (!product) {
    throw new ApiError(404, 'Product not found or you do not own this product');
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

    // Append new images to existing ones
    product.images = [...(product.images || []), ...newImages];
  }

  // Update other fields
  const allowedFields = [
    'name', 'description', 'shortDescription', 'category', 'subcategory',
    'gender', 'price', 'originalPrice', 'discount', 'stock',
    'lowStockThreshold', 'variants', 'attributes', 'brand', 'tags', 'images'
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined && field !== 'images') {
      product[field] = req.body[field];
    }
  });

  // If images array is explicitly provided in body (for reorder/delete)
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

// Delete (soft) seller's own product
export const deleteSellerProduct = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findOne({ _id: id, createdBy: req.user.id });
  if (!product) {
    throw new ApiError(404, 'Product not found or you do not own this product');
  }

  product.isActive = false;
  await product.save();

  // Update seller's product count
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { 'sellerProfile.totalProducts': -1 }
  });

  res.status(200).json({
    success: true,
    message: 'Product deactivated successfully'
  });
};

// Delete a specific product image
export const deleteProductImage = async (req, res) => {
  const { id, imageIndex } = req.params;

  const product = await Product.findOne({ _id: id, createdBy: req.user.id });
  if (!product) {
    throw new ApiError(404, 'Product not found or you do not own this product');
  }

  const idx = parseInt(imageIndex);
  if (idx < 0 || idx >= product.images.length) {
    throw new ApiError(400, 'Invalid image index');
  }

  // Delete from Cloudinary
  const image = product.images[idx];
  if (image.publicId && !image.publicId.startsWith('local_')) {
    try {
      await deleteImage(image.publicId);
    } catch (err) {
      console.warn('Failed to delete image from Cloudinary:', err.message);
    }
  }

  product.images.splice(idx, 1);

  // If main image was deleted, set first remaining as main
  if (image.isMain && product.images.length > 0) {
    product.images[0].isMain = true;
  }

  await product.save();

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    images: product.images
  });
};

// ================= SELLER ORDERS =================
export const getSellerOrders = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const seller = await Seller.findOne({ userId: req.user.id });

  if (!seller) {
    return res.status(200).json({ success: true, orders: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } });
  }

  const query = {
    'sellerSuborders.sellerId': seller._id
  };
  if (status && status !== 'ALL') {
    query['sellerSuborders.status'] = status;
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('userId', 'firstName lastName email phone')
    .lean();

  const total = await Order.countDocuments(query);

  // Map to individual seller suborders for privacy & fulfillment
  const suborderList = [];
  orders.forEach(order => {
    const mySuborders = (order.sellerSuborders || []).filter(
      sub => sub.sellerId?.toString() === seller._id.toString()
    );

    mySuborders.forEach(sub => {
      suborderList.push({
        orderId: order._id,
        orderNumber: order.orderNumber,
        suborderId: sub.suborderId,
        customerName: `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`.trim() || 'Customer',
        customerPhone: order.phone,
        shippingAddress: order.shippingAddress,
        items: sub.items,
        subtotal: sub.subtotal,
        commissionRate: sub.commissionRate,
        platformCommission: sub.platformCommission,
        sellerPayout: sub.sellerPayout,
        status: sub.status,
        trackingDetails: sub.trackingDetails,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt
      });
    });
  });

  res.status(200).json({
    success: true,
    orders: suborderList,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
};

// Dispatch a suborder
export const dispatchOrder = async (req, res) => {
  const { id } = req.params; // orderId or suborderId
  const { trackingNumber, carrier, suborderId } = req.body;

  const seller = await Seller.findOne({ userId: req.user.id });
  if (!seller) {
    throw new ApiError(403, 'Seller profile not found');
  }

  const order = await Order.findOne({
    $or: [{ _id: id }, { 'sellerSuborders.suborderId': suborderId || id }]
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const suborder = order.sellerSuborders?.find(
    sub => sub.sellerId?.toString() === seller._id.toString() &&
      (!suborderId || sub.suborderId === suborderId)
  );

  if (!suborder) {
    throw new ApiError(403, 'You do not have items in this order');
  }

  suborder.status = 'shipped';
  suborder.dispatchedAt = new Date();
  suborder.trackingDetails = {
    carrier: carrier || 'SKLP Express',
    trackingNumber: trackingNumber || `TRK-${Date.now().toString().slice(-6)}`,
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  };

  // If all suborders are shipped, update main order status
  const allShipped = order.sellerSuborders.every(s => ['shipped', 'delivered'].includes(s.status));
  if (allShipped) {
    order.status = 'shipped';
  }

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: 'shipped',
    updatedAt: new Date(),
    comment: `Suborder #${suborder.suborderId} dispatched by ${seller.shopName}`
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Suborder dispatched successfully',
    suborder
  });
};

// ================= SELLER PROFILE =================
export const getSellerProfile = async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      sellerProfile: user.sellerProfile || {},
    }
  });
};

export const updateSellerProfile = async (req, res) => {
  const {
    storeName, storeDescription, gstNumber, panNumber,
    bankDetails, firstName, lastName, phone
  } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Update basic info
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) {
    const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
    if (phoneExists) {
      throw new ApiError(409, 'Phone number already in use');
    }
    user.phone = phone;
  }

  // Update seller profile
  if (!user.sellerProfile) user.sellerProfile = {};
  if (storeName) user.sellerProfile.storeName = storeName;
  if (storeDescription) user.sellerProfile.storeDescription = storeDescription;
  if (gstNumber) user.sellerProfile.gstNumber = gstNumber;
  if (panNumber) user.sellerProfile.panNumber = panNumber;
  if (bankDetails) {
    user.sellerProfile.bankDetails = {
      ...user.sellerProfile.bankDetails,
      ...bankDetails
    };
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      sellerProfile: user.sellerProfile,
    }
  });
};
