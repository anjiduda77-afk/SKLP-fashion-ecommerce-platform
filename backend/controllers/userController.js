import mongoose from 'mongoose';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { ApiError } from '../middleware/errorHandler.js';
import NodeCache from 'node-cache';

// In-memory cache for recently viewed products, expires in 24 hours
const recentlyViewedCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

// Helper to record a recently viewed item (called from product controller when a product detail is viewed)
export const recordRecentlyViewed = (userId, productId) => {
  if (!userId || !productId) return;
  const key = `rv_${userId}`;
  let list = recentlyViewedCache.get(key) || [];
  // Filter out existing and keep only the latest 6 unique items
  list = [productId, ...list.filter(id => id !== productId)].slice(0, 6);
  recentlyViewedCache.set(key, list);
};

// Get current user profile
export const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.status(200).json({
    success: true,
    user: user.toJSON()
  });
};

// Update user profile details
export const updateProfile = async (req, res) => {
  const { firstName, lastName, phone, avatar, preferences } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) {
    const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
    if (phoneExists) {
      throw new ApiError(409, 'Phone number is already in use by another account');
    }
    user.phone = phone;
  }
  if (avatar !== undefined) user.avatar = avatar;
  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: user.toJSON()
  });
};

// Change password
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'Old and new passwords are required');
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid old password');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
};

// Get user addresses
export const getAddresses = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    addresses: user.addresses || []
  });
};

// Add new address
export const addAddress = async (req, res) => {
  const { type, street, city, state, postalCode, country, isDefault } = req.body;
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const newAddress = {
    _id: new mongoose.Types.ObjectId(),
    type: type || 'home',
    street,
    city,
    state,
    postalCode,
    country,
    isDefault: !!isDefault
  };

  // If set to default, unset other default addresses
  if (newAddress.isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
    user.defaultAddressId = newAddress._id;
  } else if (user.addresses.length === 0) {
    newAddress.isDefault = true;
    user.defaultAddressId = newAddress._id;
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    addresses: user.addresses
  });
};

// Update an address
export const updateAddress = async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // Update address fields
  const fields = ['type', 'street', 'city', 'state', 'postalCode', 'country', 'isDefault'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      address[field] = req.body[field];
    }
  });

  // Handle defaults
  if (req.body.isDefault) {
    user.addresses.forEach(addr => {
      if (addr._id.toString() !== addressId) {
        addr.isDefault = false;
      }
    });
    user.defaultAddressId = address._id;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    addresses: user.addresses
  });
};

// Delete address
export const deleteAddress = async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // Remove the address using Mongoose array filter / pull or pull method
  user.addresses.pull(addressId);

  // If deleted address was default, assign a new default if possible
  if (user.defaultAddressId && user.defaultAddressId.toString() === addressId) {
    if (user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
      user.defaultAddressId = user.addresses[0]._id;
    } else {
      user.defaultAddressId = undefined;
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address removed successfully',
    addresses: user.addresses
  });
};

// Get wishlist items
export const getWishlist = async (req, res) => {
  let wishlist = await Wishlist.findOne({ userId: req.user.id }).populate('items.productId');
  
  if (!wishlist) {
    wishlist = await Wishlist.create({
      userId: req.user.id,
      items: [],
      totalItems: 0
    });
  }

  // Filter out any products that were deleted but still referenced in wishlist items
  const validItems = wishlist.items.filter(item => item.productId !== null);
  if (validItems.length !== wishlist.items.length) {
    wishlist.items = validItems;
    wishlist.totalItems = validItems.length;
    await wishlist.save();
  }

  res.status(200).json({
    success: true,
    wishlist: {
      items: wishlist.items.map(item => ({
        _id: item._id,
        addedAt: item.addedAt,
        notes: item.notes,
        product: item.productId // mapped as product object on frontend
      })),
      totalItems: wishlist.totalItems
    }
  });
};

// Add product to wishlist (mounted dynamically or called via wishlist endpoints)
export const addToWishlist = async (req, res) => {
  const { productId, notes } = req.body;
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  let wishlist = await Wishlist.findOne({ userId: req.user.id });
  if (!wishlist) {
    wishlist = await Wishlist.create({
      userId: req.user.id,
      items: [],
      totalItems: 0
    });
  }

  const alreadyInWishlist = wishlist.items.some(item => item.productId.toString() === productId);
  if (alreadyInWishlist) {
    return res.status(200).json({
      success: true,
      message: 'Product already in wishlist',
      wishlist
    });
  }

  wishlist.items.push({
    _id: new mongoose.Types.ObjectId(),
    productId,
    priceAtAdd: product.price,
    notes: notes || '',
    addedAt: new Date()
  });

  wishlist.totalItems = wishlist.items.length;
  wishlist.lastModified = new Date();
  await wishlist.save();

  res.status(201).json({
    success: true,
    message: 'Added to wishlist',
    wishlist
  });
};

// Remove product from wishlist
export const removeFromWishlist = async (req, res) => {
  const { productId } = req.params;
  const wishlist = await Wishlist.findOne({ userId: req.user.id });

  if (!wishlist) {
    throw new ApiError(404, 'Wishlist not found');
  }

  const initialCount = wishlist.items.length;
  wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId);
  
  if (wishlist.items.length === initialCount) {
    throw new ApiError(404, 'Product not found in wishlist');
  }

  wishlist.totalItems = wishlist.items.length;
  wishlist.lastModified = new Date();
  await wishlist.save();

  res.status(200).json({
    success: true,
    message: 'Removed from wishlist',
    wishlist
  });
};

// Clear wishlist
export const clearWishlist = async (req, res) => {
  const wishlist = await Wishlist.findOne({ userId: req.user.id });
  if (wishlist) {
    wishlist.items = [];
    wishlist.totalItems = 0;
    wishlist.lastModified = new Date();
    await wishlist.save();
  }

  res.status(200).json({
    success: true,
    message: 'Wishlist cleared successfully',
    wishlist
  });
};

// Get recently viewed products
export const getRecentlyViewed = async (req, res) => {
  const key = `rv_${req.user.id}`;
  const ids = recentlyViewedCache.get(key) || [];

  let products = [];
  if (ids.length > 0) {
    products = await Product.find({ _id: { $in: ids }, isActive: true }).lean();
    // Sort products in order of recently viewed
    products = ids
      .map(id => products.find(p => p._id.toString() === id.toString()))
      .filter(Boolean);
  }

  // Fallback to featured or standard trending products if no recent views exist
  if (products.length === 0) {
    products = await Product.find({ isActive: true }).limit(6).lean();
  }

  res.status(200).json({
    success: true,
    products
  });
};
