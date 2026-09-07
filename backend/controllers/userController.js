import mongoose from 'mongoose';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import { sendPushNotification } from '../config/firebaseAdmin.js';
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
  const { firstName, lastName, avatar, preferences, fashionPreferences, phone } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (firstName !== undefined) user.firstName = firstName.trim() || user.firstName;
  if (lastName !== undefined) user.lastName = lastName.trim() || user.lastName;
  
  // Direct phone update with 10-digit validation (OTP removed)
  if (phone !== undefined && phone !== user.phone) {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone && /^[0-9]{10}$/.test(cleanPhone)) {
      const existingUser = await User.findOne({ phone: cleanPhone, _id: { $ne: req.user.id } });
      if (existingUser) {
        throw new ApiError(409, 'This phone number is already associated with another account');
      }
      user.phone = cleanPhone;
    } else if (!phone) {
      user.phone = undefined;
    } else {
      throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number');
    }
  }

  if (avatar !== undefined) {
    if (typeof avatar === 'string') {
      user.avatar = { url: avatar, publicId: null };
    } else {
      user.avatar = avatar;
    }
  }

  if (preferences) {
    user.preferences = {
      ...(user.preferences?.toObject ? user.preferences.toObject() : user.preferences || {}),
      ...preferences
    };
  }

  if (fashionPreferences) {
    user.fashionPreferences = {
      ...(user.fashionPreferences?.toObject ? user.fashionPreferences.toObject() : user.fashionPreferences || {}),
      ...fashionPreferences
    };
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: user.toJSON()
  });
};

// Update comprehensive user preferences
export const updatePreferences = async (req, res) => {
  const { preferences, fashionPreferences, savedPaymentMethods } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (preferences) {
    const currentPrefs = user.preferences?.toObject ? user.preferences.toObject() : (user.preferences || {});
    user.preferences = {
      ...currentPrefs,
      ...preferences,
      notifications: {
        ...(currentPrefs.notifications || {}),
        ...(preferences.notifications || {})
      }
    };
  }

  if (fashionPreferences) {
    const currentFashion = user.fashionPreferences?.toObject ? user.fashionPreferences.toObject() : (user.fashionPreferences || {});
    user.fashionPreferences = {
      ...currentFashion,
      ...fashionPreferences
    };
  }

  if (savedPaymentMethods) {
    const currentPay = user.savedPaymentMethods?.toObject ? user.savedPaymentMethods.toObject() : (user.savedPaymentMethods || {});
    user.savedPaymentMethods = {
      ...currentPay,
      ...savedPaymentMethods
    };
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Preferences saved successfully',
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

// Toggle 2FA
export const toggleTwoFactor = async (req, res) => {
  const { enabled } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.twoFactorEnabled = enabled !== undefined ? !!enabled : !user.twoFactorEnabled;
  await user.save();

  res.status(200).json({
    success: true,
    message: `Two-factor authentication ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`,
    twoFactorEnabled: user.twoFactorEnabled
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
  const { type, label, street, landmark, city, state, postalCode, pincode, country, phone, isDefault } = req.body;
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Required field validations
  const cleanStreet = typeof street === 'string' ? street.trim() : '';
  const cleanCity = typeof city === 'string' ? city.trim() : '';
  const cleanState = typeof state === 'string' ? state.trim() : '';
  const rawPincode = String(postalCode || pincode || '').trim();

  if (!cleanStreet || !cleanCity || !cleanState || !rawPincode) {
    throw new ApiError(400, 'Street address, city, state, and 6-digit PIN code are required');
  }

  // PIN code format validation (strictly 6-digit Indian PIN)
  if (!/^[1-9][0-9]{5}$/.test(rawPincode)) {
    throw new ApiError(400, 'Please enter a valid 6-digit Indian postal PIN code (e.g. 500081)');
  }

  // Phone validation (if provided)
  let cleanPhone = '';
  if (phone) {
    const digits = String(phone).replace(/\D/g, '').slice(-10);
    if (!/^[6-9][0-9]{9}$/.test(digits)) {
      throw new ApiError(400, 'Please enter a valid 10-digit Indian contact mobile number');
    }
    cleanPhone = digits;
  } else if (user.phone) {
    cleanPhone = user.phone;
  }

  // Duplicate address check (case-insensitive on street, city, and pincode)
  const isDuplicate = (user.addresses || []).some(addr => 
    addr.street?.trim().toLowerCase() === cleanStreet.toLowerCase() &&
    addr.city?.trim().toLowerCase() === cleanCity.toLowerCase() &&
    (addr.postalCode === rawPincode || addr.pincode === rawPincode)
  );

  if (isDuplicate) {
    throw new ApiError(409, 'This delivery address is already saved in your address book');
  }

  const effectiveType = (type || label || 'home').toLowerCase();

  const newAddress = {
    _id: new mongoose.Types.ObjectId(),
    type: ['home', 'office', 'other', 'work'].includes(effectiveType) ? effectiveType : 'home',
    label: label || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Home'),
    street: cleanStreet,
    landmark: landmark ? String(landmark).trim() : '',
    city: cleanCity,
    state: cleanState,
    postalCode: rawPincode,
    pincode: rawPincode,
    country: country ? String(country).trim() : 'India',
    phone: cleanPhone,
    isDefault: !!isDefault
  };

  // If set to default or this is the user's first address, make it default
  if (newAddress.isDefault || user.addresses.length === 0) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
    newAddress.isDefault = true;
    user.defaultAddressId = newAddress._id;
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Delivery address added successfully',
    address: newAddress,
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

  // Validations if fields are being updated
  if (req.body.street !== undefined && !String(req.body.street).trim()) {
    throw new ApiError(400, 'Street address cannot be empty');
  }
  if (req.body.city !== undefined && !String(req.body.city).trim()) {
    throw new ApiError(400, 'City cannot be empty');
  }
  if (req.body.state !== undefined && !String(req.body.state).trim()) {
    throw new ApiError(400, 'State cannot be empty');
  }

  const newPincode = req.body.postalCode || req.body.pincode;
  if (newPincode !== undefined) {
    const cleanPin = String(newPincode).trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      throw new ApiError(400, 'Please enter a valid 6-digit Indian postal PIN code (e.g. 500081)');
    }
    address.postalCode = cleanPin;
    address.pincode = cleanPin;
  }

  if (req.body.phone !== undefined && req.body.phone !== '') {
    const digits = String(req.body.phone).replace(/\D/g, '').slice(-10);
    if (!/^[6-9][0-9]{9}$/.test(digits)) {
      throw new ApiError(400, 'Please enter a valid 10-digit Indian contact mobile number');
    }
    address.phone = digits;
  }

  // Update other allowed fields
  if (req.body.street !== undefined) address.street = String(req.body.street).trim();
  if (req.body.city !== undefined) address.city = String(req.body.city).trim();
  if (req.body.state !== undefined) address.state = String(req.body.state).trim();
  if (req.body.landmark !== undefined) address.landmark = String(req.body.landmark).trim();
  if (req.body.country !== undefined) address.country = String(req.body.country).trim();
  if (req.body.label !== undefined) address.label = String(req.body.label).trim();
  if (req.body.type !== undefined) {
    const t = String(req.body.type).toLowerCase();
    address.type = ['home', 'office', 'other', 'work'].includes(t) ? t : 'home';
  }

  // Handle default toggle
  if (req.body.isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === addressId;
    });
    user.defaultAddressId = address._id;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    address,
    addresses: user.addresses
  });
};

// Set default address
export const setDefaultAddress = async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  user.addresses.forEach(addr => {
    addr.isDefault = addr._id.toString() === addressId;
  });
  user.defaultAddressId = address._id;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Default delivery address updated successfully',
    defaultAddressId: address._id,
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

  // Remove the address
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

// Manage Saved UPI
export const addSavedUpi = async (req, res) => {
  const { upiId, label, isDefault } = req.body;
  if (!upiId || !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
    throw new ApiError(400, 'Please enter a valid UPI ID (e.g. name@okhdfcbank)');
  }
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (!user.savedPaymentMethods) user.savedPaymentMethods = { savedUpi: [] };
  if (!user.savedPaymentMethods.savedUpi) user.savedPaymentMethods.savedUpi = [];

  if (isDefault) {
    user.savedPaymentMethods.savedUpi.forEach(u => { u.isDefault = false; });
  }

  const newUpi = {
    _id: new mongoose.Types.ObjectId(),
    upiId: upiId.trim().toLowerCase(),
    label: label || 'Google Pay / PhonePe',
    isDefault: !!isDefault || user.savedPaymentMethods.savedUpi.length === 0
  };

  user.savedPaymentMethods.savedUpi.push(newUpi);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'UPI ID saved successfully',
    savedUpi: user.savedPaymentMethods.savedUpi
  });
};

export const deleteSavedUpi = async (req, res) => {
  const { upiId } = req.params;
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.savedPaymentMethods?.savedUpi) {
    user.savedPaymentMethods.savedUpi = user.savedPaymentMethods.savedUpi.filter(
      u => u._id.toString() !== upiId && u.upiId !== upiId
    );
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: 'UPI ID removed',
    savedUpi: user.savedPaymentMethods?.savedUpi || []
  });
};

// Export user account data
export const exportUserData = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const orders = await Order.find({ userId: req.user.id }).lean();
  const wishlist = await Wishlist.findOne({ userId: req.user.id }).populate('items.productId').lean();

  const exportData = {
    exportDate: new Date().toISOString(),
    account: {
      userId: user.customUserId || user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      preferences: user.preferences,
      fashionPreferences: user.fashionPreferences
    },
    addresses: user.addresses || [],
    orders: orders.map(o => ({
      orderId: o._id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      status: o.status,
      totalAmount: o.totalAmount,
      items: o.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price }))
    })),
    wishlistCount: wishlist?.items?.length || 0
  };

  res.status(200).json({
    success: true,
    data: exportData
  });
};

// Deactivate Account
export const deactivateAccount = async (req, res) => {
  const { reason, password } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');

  if (password && user.password) {
    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new ApiError(401, 'Invalid password');
  }

  user.status = 'inactive';
  user.isActive = false;
  user.accountDeletedAt = new Date();
  user.accountDeleteReason = reason || 'User requested deactivation';
  user.refreshTokens = [];
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Your account has been deactivated successfully.'
  });
};

// Get wishlist items
export const getWishlist = async (req, res) => {
  let wishlist = await Wishlist.findOne({ userId: req.user.id }).populate('items.productId');
  
  if (!wishlist) {
    try {
      wishlist = await Wishlist.create({
        userId: req.user.id,
        items: [],
        totalItems: 0
      });
    } catch (err) {
      if (err.code === 11000) {
        wishlist = await Wishlist.findOne({ userId: req.user.id }).populate('items.productId');
      } else {
        throw err;
      }
    }
  }

  if (!wishlist) {
    return res.status(200).json({ success: true, wishlist: { items: [], totalItems: 0 } });
  }

  // Filter out any products that were deleted but still referenced in wishlist items
  const validItems = (wishlist.items || []).filter(item => item.productId !== null);
  if (validItems.length !== (wishlist.items || []).length) {
    wishlist.items = validItems;
    wishlist.totalItems = validItems.length;
    await wishlist.save();
  }

  res.status(200).json({
    success: true,
    wishlist: {
      items: (wishlist.items || []).map(item => ({
        _id: item._id,
        addedAt: item.addedAt,
        notes: item.notes,
        product: item.productId // mapped as product object on frontend
      })),
      totalItems: wishlist.totalItems || 0
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
    try {
      wishlist = await Wishlist.create({
        userId: req.user.id,
        items: [],
        totalItems: 0
      });
    } catch (err) {
      if (err.code === 11000) {
        wishlist = await Wishlist.findOne({ userId: req.user.id });
      } else {
        throw err;
      }
    }
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

// Register or refresh FCM Device Token for Web Push
export const registerFcmToken = async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    throw new ApiError(400, 'Valid FCM device token is required');
  }

  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { fcmTokens: token.trim() }
  });

  res.status(200).json({
    success: true,
    message: 'Device notification token registered successfully'
  });
};

// Retrieve User Notifications
export const getUserNotifications = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId: req.user.id }),
    Notification.countDocuments({ userId: req.user.id, isRead: false })
  ]);

  res.status(200).json({
    success: true,
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    unreadCount
  });
};

// Mark Single Notification Read
export const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: req.user.id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    notification
  });
};

// Mark All Notifications Read
export const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
};

// Send Test Notification (In-App + FCM Push)
export const sendTestNotification = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const title = '✨ SKLP Royal Couture Drop';
  const message = 'Your exclusive VIP access to the Festive 2026 Collection is now live. Experience bespoke luxury.';
  const actionUrl = '/products';

  // 1. Save In-App Notification in DB
  const notification = await Notification.create({
    userId: user._id,
    type: 'offer',
    title,
    message,
    actionUrl,
    channels: {
      inApp: true,
      push: {
        sent: Boolean(user.fcmTokens?.length > 0),
        sentAt: new Date()
      }
    }
  });

  // 2. Dispatch FCM Push if device tokens registered
  let pushResult = null;
  if (user.fcmTokens && user.fcmTokens.length > 0) {
    pushResult = await sendPushNotification({
      tokens: user.fcmTokens,
      title,
      body: message,
      data: {
        actionUrl,
        notificationId: notification._id.toString()
      }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Test notification sent successfully',
    notification,
    pushResult
  });
};

