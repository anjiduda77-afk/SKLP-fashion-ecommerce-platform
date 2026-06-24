import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
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

  // Authentication
  authProvider: {
    type: String,
    enum: ['email', 'google', 'otp'],
    default: 'email'
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
  phoneVerificationToken: String,

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
    enum: ['customer', 'admin', 'seller', 'delivery', 'deliveryPartner', 'moderator'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
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
      enum: ['home', 'office', 'other'],
      default: 'home'
    },
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    isDefault: Boolean,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  defaultAddressId: mongoose.Schema.Types.ObjectId,

  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'te', 'hi'],
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    newsletter: { type: Boolean, default: false }
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
userSchema.pre('save', async function(next) {
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
userSchema.pre('save', function(next) {
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
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get user info without sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.twoFactorSecret;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpiry;
  delete user.phoneVerificationToken;
  delete user.refreshTokens;
  delete user.passwordHistory;
  return user;
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > new Date();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
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
userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  return this.save();
};

// Add a refresh token for a device
userSchema.methods.addRefreshToken = function(token, device, ip) {
  if (!this.refreshTokens) this.refreshTokens = [];
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  this.refreshTokens.push({ token, device, ip, expiresAt });
  return this.save();
};

// Remove a specific refresh token (on logout)
userSchema.methods.removeRefreshToken = function(token) {
  if (!this.refreshTokens) this.refreshTokens = [];
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Remove all refresh tokens (logout all devices)
userSchema.methods.removeAllRefreshTokens = function() {
  this.refreshTokens = [];
  return this.save();
};

// Validate password strength
userSchema.statics.validatePasswordStrength = function(password) {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
  return { isValid: errors.length === 0, errors };
};

// Indexes for performance
userSchema.index({ googleId: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'sellerProfile.isVerified': 1 });

export default mongoose.model('User', userSchema);
