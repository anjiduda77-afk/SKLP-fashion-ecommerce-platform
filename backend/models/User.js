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
    type: String,
    default: null
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
  phoneVerificationToken: String,

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

  // Addresses
  addresses: [{
    _id: mongoose.Schema.Types.ObjectId,
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
  lastPasswordChange: Date,
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,

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
  delete user.phoneVerificationToken;
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

// Indexes for performance
userSchema.index({ googleId: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ createdAt: -1 });

export default mongoose.model('User', userSchema);
