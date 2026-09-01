import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    default: 'Customer',
    trim: true
  },
  lastName: {
    type: String,
    default: 'User',
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    sparse: true,
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password by default
  },
  avatar: {
    url: { type: String, default: null },
    publicId: { type: String, default: null }
  },

  // Unique Custom User ID (e.g. USER_12345)
  customUserId: {
    type: String,
    unique: true,
    sparse: true,
    default: () => `USER_${Date.now().toString().slice(-4)}${Math.floor(10000 + Math.random() * 90000)}`
  },

  // Authentication
  authProvider: {
    type: String,
    enum: ['email', 'google', 'otp', 'firebase'],
    default: 'firebase'
  },
  firebaseUid: {
    type: String,
    sparse: true,
    unique: true
  },
  googleId: String,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
  passwordResetToken: String,
  passwordResetExpiry: Date,
  phoneVerificationToken: String,

  // OTP Authentication (dedicated fields — not shared with lockUntil)
  phoneOtp: String,
  phoneOtpExpiry: Date,
  phoneOtpAttempts: { type: Number, default: 0 },
  phoneOtpResendCount: { type: Number, default: 0 },
  lastOtpSentAt: Date,

  // Refresh Token Management (stored per device)
  refreshTokens: [{
    token: { type: String, required: true },
    device: { type: String, default: 'unknown' },
    ip: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  }],

  // User Status
  role: {
    type: String,
    enum: ['customer', 'admin', 'seller', 'delivery', 'moderator'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'blocked', 'deleted'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Seller Profile (only populated for role === 'seller')
  sellerProfile: {
    storeName: { type: String, default: '' },
    storeDescription: { type: String, default: '' },
    storeLogo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null }
    },
    gstNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    bankDetails: {
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' }
    },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalProducts: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 10 }, // percentage
  },

  // Addresses
  addresses: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    type: {
      type: String,
      enum: ['home', 'office', 'other', 'work'],
      default: 'home'
    },
    label: { type: String, default: 'Home' },
    street: String,
    landmark: String,
    city: String,
    state: String,
    postalCode: String,
    pincode: String,
    country: { type: String, default: 'India' },
    phone: String,
    isDefault: { type: Boolean, default: false },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  defaultAddressId: mongoose.Schema.Types.ObjectId,

  // Preferences & Settings
  preferences: {
    language: {
      type: String,
      enum: ['en', 'te', 'hi'],
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'dark'
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: 'INR'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promoAlerts: { type: Boolean, default: true },
      priceDropAlerts: { type: Boolean, default: true }
    },
    deliveryInstructions: {
      type: String,
      default: ''
    },
    preferredSlot: {
      type: String,
      enum: ['anytime', 'morning', 'afternoon', 'evening'],
      default: 'anytime'
    },
    newsletter: { type: Boolean, default: false }
  },

  // Fashion Identity
  fashionPreferences: {
    genderPreference: {
      type: String,
      enum: ['all', 'men', 'women', 'kids', 'unisex'],
      default: 'all'
    },
    clothingSize: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Custom'],
      default: 'M'
    },
    shoeSize: {
      type: String,
      enum: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'],
      default: 'UK 8'
    },
    styleVibe: {
      type: String,
      enum: ['Royal Couture', 'Minimal Luxe', 'Ethnic Festive', 'Street Luxury', 'Classic Formal'],
      default: 'Royal Couture'
    }
  },

  // Saved Payment Preferences
  savedPaymentMethods: {
    savedUpi: [{
      _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      upiId: { type: String, required: true },
      label: { type: String, default: 'Google Pay / PhonePe' },
      isDefault: { type: Boolean, default: false }
    }],
    preferredPayment: {
      type: String,
      enum: ['razorpay', 'upi', 'card', 'cod'],
      default: 'razorpay'
    }
  },

  // Security
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  lastLoginIP: { type: String, default: '' },
  lastLoginDevice: { type: String, default: '' },
  lastPasswordChange: Date,
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  passwordHistory: [{ type: String, select: false }], // Store hashed old passwords

  // Statistics
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  referralCode: String,
  referredBy: mongoose.Schema.Types.ObjectId,

  // Account Information
  accountDeletedAt: Date,
  accountDeleteReason: String,

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChange = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Clean up expired refresh tokens before saving
userSchema.pre('save', function (next) {
  if (this.refreshTokens && this.refreshTokens.length > 0) {
    this.refreshTokens = this.refreshTokens.filter(
      rt => rt.expiresAt > new Date()
    );
    // Keep only the latest 5 refresh tokens (5 devices)
    if (this.refreshTokens.length > 5) {
      this.refreshTokens = this.refreshTokens.slice(-5);
    }
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get user info without sensitive data
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  // Add string id alias for frontend compatibility
  user.id = user._id.toString();
  // Scrub sensitive internal fields
  delete user.password;
  delete user.twoFactorSecret;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpiry;
  delete user.phoneVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpiry;
  delete user.refreshTokens;
  delete user.passwordHistory;
  return user;
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function () {
  this.loginAttempts = (this.loginAttempts || 0) + 1;

  // Lock account after max attempts
  const maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockTime = parseInt(process.env.LOCK_TIME) || 15; // minutes

  if (this.loginAttempts >= maxLoginAttempts) {
    this.lockUntil = new Date(Date.now() + lockTime * 60 * 1000);
  }

  return this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  return this.save();
};

// Add a refresh token for a device
userSchema.methods.addRefreshToken = function (token, device, ip) {
  if (!this.refreshTokens) this.refreshTokens = [];
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  this.refreshTokens.push({ token, device, ip, expiresAt });
  return this.save();
};

// Remove a specific refresh token (on logout)
userSchema.methods.removeRefreshToken = function (token) {
  if (!this.refreshTokens) this.refreshTokens = [];
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Remove all refresh tokens (logout all devices)
userSchema.methods.removeAllRefreshTokens = function () {
  this.refreshTokens = [];
  return this.save();
};

// Validate password strength
userSchema.statics.validatePasswordStrength = function (password) {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
  return { isValid: errors.length === 0, errors };
};

// Indexes for performance
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ referralCode: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'sellerProfile.isVerified': 1 });

export default mongoose.model('User', userSchema);