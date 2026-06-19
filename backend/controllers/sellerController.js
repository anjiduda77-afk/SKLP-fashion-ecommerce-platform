import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';
import { uploadMultipleImages, deleteImage } from '../config/cloudinary.js';

// ================= SELLER DASHBOARD =================
export const getSellerDashboard = async (req, res) => {
  const sellerId = req.user.id;

  // Total products by this seller
  const totalProducts = await Product.countDocuments({ createdBy: sellerId, isActive: true });
  const outOfStockProducts = await Product.countDocuments({ createdBy: sellerId, isActive: true, stock: 0 });
  const lowStockProducts = await Product.countDocuments({
    createdBy: sellerId, isActive: true,
    stock: { $gt: 0, $lte: 10 }
  });

  // Get seller's product IDs for order queries
  const sellerProducts = await Product.find({ createdBy: sellerId }).select('_id').lean();
  const sellerProductIds = sellerProducts.map(p => p._id);

  // Orders containing seller's products
  const ordersWithSellerItems = await Order.find({
    'items.productId': { $in: sellerProductIds },
    status: { $nin: ['cancelled'] }
  }).lean();

  let totalRevenue = 0;
  let totalOrderCount = ordersWithSellerItems.length;
  let pendingOrders = 0;
  let dispatchedOrders = 0;
  let deliveredOrders = 0;

  ordersWithSellerItems.forEach(order => {
    // Calculate revenue only from seller's items
    order.items.forEach(item => {
      if (sellerProductIds.some(id => id.toString() === item.productId?.toString())) {
        totalRevenue += (item.finalPrice || item.price || 0) * (item.quantity || 1);
      }
    });

    if (order.status === 'pending' || order.status === 'confirmed') pendingOrders++;
    else if (order.status === 'shipped' || order.status === 'packed') dispatchedOrders++;
    else if (order.status === 'delivered') deliveredOrders++;
  });

  // Weekly revenue (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyOrders = ordersWithSellerItems.filter(o => new Date(o.createdAt) >= weekAgo);
  let weeklyRevenue = 0;
  weeklyOrders.forEach(order => {
    order.items.forEach(item => {
      if (sellerProductIds.some(id => id.toString() === item.productId?.toString())) {
        weeklyRevenue += (item.finalPrice || item.price || 0) * (item.quantity || 1);
      }
    });
  });

  // Top selling products
  const productSales = {};
  ordersWithSellerItems.forEach(order => {
    order.items.forEach(item => {
      const pid = item.productId?.toString();
      if (pid && sellerProductIds.some(id => id.toString() === pid)) {
        if (!productSales[pid]) {
          productSales[pid] = { name: item.productName || item.name || 'Product', quantity: 0, revenue: 0 };
        }
        productSales[pid].quantity += item.quantity || 1;
        productSales[pid].revenue += (item.finalPrice || item.price || 0) * (item.quantity || 1);
      }
    });
  });

  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({ productId: id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Get seller profile
  const seller = await User.findById(sellerId).lean();

  res.status(200).json({
    success: true,
    dashboard: {
      metrics: {
        totalProducts,
        outOfStockProducts,
        lowStockProducts,
        totalOrders: totalOrderCount,
        pendingOrders,
        dispatchedOrders,
        deliveredOrders,
        totalRevenue,
        weeklyRevenue,
      },
      topProducts,
      sellerProfile: {
        storeName: seller?.sellerProfile?.storeName || '',
        isVerified: seller?.sellerProfile?.isVerified || false,
        rating: seller?.sellerProfile?.rating || 0,
        commissionRate: seller?.sellerProfile?.commissionRate || 10,
      },
      recentOrders: weeklyOrders.slice(0, 5).map(o => ({
        id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        date: o.createdAt,
      }))
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

  // Get seller's product IDs
  const sellerProducts = await Product.find({ createdBy: req.user.id }).select('_id').lean();
  const sellerProductIds = sellerProducts.map(p => p._id);

  const query = {
    'items.productId': { $in: sellerProductIds }
  };
  if (status) query.status = status;

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('userId', 'firstName lastName email')
    .lean();

  const total = await Order.countDocuments(query);

  // Filter items to only show seller's products
  const filteredOrders = orders.map(order => ({
    ...order,
    items: order.items.filter(item =>
      sellerProductIds.some(id => id.toString() === item.productId?.toString())
    )
  }));

  res.status(200).json({
    success: true,
    orders: filteredOrders,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
};

// Dispatch an order (update status)
export const dispatchOrder = async (req, res) => {
  const { id } = req.params;
  const { trackingNumber, carrier } = req.body;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Verify seller owns at least one product in this order
  const sellerProducts = await Product.find({ createdBy: req.user.id }).select('_id').lean();
  const sellerProductIds = sellerProducts.map(p => p._id.toString());
  const hasSellerItem = order.items.some(item =>
    sellerProductIds.includes(item.productId?.toString())
  );

  if (!hasSellerItem) {
    throw new ApiError(403, 'You do not have items in this order');
  }

  order.status = 'shipped';
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (carrier) order.carrier = carrier;

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: 'shipped',
    updatedAt: new Date(),
    comment: `Dispatched by seller ${req.user.id}`
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Order dispatched successfully',
    order
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
