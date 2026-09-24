import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Seller from '../models/Seller.js';
import User from '../models/User.js';
import SellerApplication from '../models/SellerApplication.js';
import Product from '../models/Product.js';
import { maskPhoneNumber } from '../utils/phoneUtils.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Format variant object into clean readable text
 */
const formatVariantText = (variant) => {
  if (!variant) return 'Standard';
  if (typeof variant === 'string') return variant;
  const parts = [];
  if (variant.size) parts.push(`Size: ${variant.size}`);
  if (variant.color || variant.colour) parts.push(`Color: ${variant.color || variant.colour}`);
  if (variant.material) parts.push(`Material: ${variant.material}`);
  if (variant.type && variant.name) parts.push(`${variant.type}: ${variant.name}`);
  return parts.length > 0 ? parts.join(' | ') : 'Standard';
};

/**
 * Helper to fetch verified seller GSTIN and profile
 */
const getSellerTaxAndBrandInfo = async (sellerId) => {
  if (!sellerId) return null;
  const seller = await Seller.findById(sellerId).lean();
  if (!seller) return null;

  let gstin = null;
  if (seller.userId) {
    const user = await User.findById(seller.userId).select('sellerProfile').lean();
    if (user?.sellerProfile?.gstNumber) {
      gstin = user.sellerProfile.gstNumber;
    }
  }

  if (!gstin && seller.userId) {
    const application = await SellerApplication.findOne({ userId: seller.userId }).select('gstNumber').lean();
    if (application?.gstNumber) {
      gstin = application.gstNumber;
    }
  }

  return {
    sellerId: seller._id,
    brandName: seller.brandName || seller.shopName || 'Style Street Partner',
    shopName: seller.shopName || 'Style Street Partner',
    pickupAddress: seller.pickupAddress || {
      street: seller.shopLocation?.address || '',
      city: seller.shopLocation?.city || '',
      state: seller.shopLocation?.state || '',
      pincode: seller.shopLocation?.pincode || '',
      country: 'India'
    },
    gstin: gstin ? gstin.toUpperCase() : null
  };
};

/**
 * @desc    Get Safe Order Receipt Data for Admin (Full parent order)
 * @route   GET /api/admin/orders/:orderId/receipt
 * @access  Private (Admin Only)
 */
export const getAdminOrderReceipt = async (req, res) => {
  const { orderId } = req.params;

  let query;
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    query = { _id: orderId };
  } else {
    query = { orderNumber: orderId };
  }

  const order = await Order.findOne(query)
    .populate('userId', 'firstName lastName email phone')
    .lean();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Ensure persistent, stable invoiceNumber
  let invoiceNumber = order.invoiceNumber;
  let invoiceDate = order.invoiceDate;
  if (!invoiceNumber) {
    invoiceNumber = `INV-${order.orderNumber || order._id.toString().toUpperCase()}`;
    invoiceDate = order.createdAt;
    await Order.updateOne(
      { _id: order._id },
      { $set: { invoiceNumber, invoiceDate } }
    ).catch((err) => console.warn('Could not persist invoiceNumber:', err));
  }

  // Collect distinct seller IDs from items and suborders
  const sellerIdSet = new Set();
  (order.items || []).forEach((item) => {
    if (item.sellerId) sellerIdSet.add(item.sellerId.toString());
  });
  (order.sellerSuborders || []).forEach((sub) => {
    if (sub.sellerId) sellerIdSet.add(sub.sellerId.toString());
  });

  const sellerProfilesMap = {};
  for (const sId of sellerIdSet) {
    const info = await getSellerTaxAndBrandInfo(sId);
    if (info) sellerProfilesMap[sId] = info;
  }

  // Enrich product SKUs if missing in snapshot
  const productIdsToLookup = (order.items || [])
    .filter((it) => !it.sku && it.productId)
    .map((it) => it.productId);

  let productSkuMap = {};
  if (productIdsToLookup.length > 0) {
    const prods = await Product.find({ _id: { $in: productIdsToLookup } })
      .select('sku name')
      .lean();
    prods.forEach((p) => {
      productSkuMap[p._id.toString()] = p.sku;
    });
  }

  // Clean items without product images
  const sanitizedItems = (order.items || []).map((item, idx) => {
    const sId = item.sellerId ? item.sellerId.toString() : null;
    const sellerInfo = sId ? sellerProfilesMap[sId] : null;
    const sku = item.sku || productSkuMap[item.productId?.toString()] || `STY-${String(idx + 101).padStart(3, '0')}`;
    const unitPrice = item.finalPrice || item.price || 0;
    const qty = item.quantity || 1;

    return {
      itemId: item._id,
      productId: item.productId,
      name: item.productName || item.name || 'Fashion Apparel',
      sku,
      brand: sellerInfo?.brandName || item.brand || 'Style Street',
      sellerShopName: sellerInfo?.shopName || item.shopNameSnapshot || 'Style Street Official',
      sellerId: item.sellerId,
      variant: item.variant || {},
      variantText: formatVariantText(item.variant),
      size: item.variant?.size || '',
      color: item.variant?.color || item.variant?.colour || '',
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty
    };
  });

  // Construct packages
  const packages = [];
  if (order.sellerSuborders && order.sellerSuborders.length > 0) {
    order.sellerSuborders.forEach((sub, idx) => {
      const sId = sub.sellerId ? sub.sellerId.toString() : null;
      const sellerInfo = sId ? sellerProfilesMap[sId] : null;

      packages.push({
        packageIndex: idx + 1,
        packageNumber: `${idx + 1}/${order.sellerSuborders.length}`,
        packageId: sub.suborderId || `PKG_${order.orderNumber}_${idx + 1}`,
        sellerId: sub.sellerId,
        sellerBrand: sellerInfo?.brandName || sub.shopNameSnapshot || 'Style Street',
        sellerShopName: sellerInfo?.shopName || sub.shopNameSnapshot || 'Style Street',
        pickupAddress: sellerInfo?.pickupAddress,
        itemsCount: (sub.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0),
        status: sub.status || order.status,
        courier: sub.trackingDetails?.carrier || order.carrier || 'Style Street Express',
        trackingNumber: sub.trackingDetails?.trackingNumber || order.trackingNumber || '',
        deliveryMethod: sub.deliveryMethod || 'self_delivery',
        deliveryFee: sub.deliveryFee || 0,
        subtotal: sub.subtotal
      });
    });
  } else {
    packages.push({
      packageIndex: 1,
      packageNumber: '1/1',
      packageId: `PKG_${order.orderNumber}_1`,
      sellerBrand: 'Style Street Official',
      sellerShopName: 'Style Street Official',
      itemsCount: sanitizedItems.reduce((acc, it) => acc + it.quantity, 0),
      status: order.status,
      courier: order.carrier || 'Style Street Express',
      trackingNumber: order.trackingNumber || '',
      deliveryMethod: 'self_delivery',
      deliveryFee: order.deliveryFee || 0,
      subtotal: order.subtotal
    });
  }

  // Customer historical address snapshot
  const customerShippingAddress = {
    street: order.shippingAddress?.street || '',
    city: order.shippingAddress?.city || '',
    district: order.shippingAddress?.district || order.shippingAddress?.city || '',
    state: order.shippingAddress?.state || '',
    postalCode: order.shippingAddress?.postalCode || '',
    country: order.shippingAddress?.country || 'India'
  };

  // Mask phone
  const rawPhone = order.shippingAddress?.phone || order.phone || order.userId?.phone || '';
  const maskedPhone = maskPhoneNumber(rawPhone);

  const customerBillingAddress = order.billingAddress || customerShippingAddress;

  // Front-end tracking URL
  const frontendOrigin = process.env.FRONTEND_URL || 'https://stylestreet.in';
  const qrUrl = `${frontendOrigin}/orders/${order.orderNumber || order._id}/track`;

  // Build safe response payload
  const receiptPayload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    status: order.status,
    paymentMethod: order.paymentMethod ? order.paymentMethod.toUpperCase() : 'PREPAID',
    isCOD: order.paymentMethod === 'cod',
    codAmount: order.paymentMethod === 'cod' ? order.totalAmount : 0,
    paymentStatus: order.paymentStatus === 'completed' ? 'PAID' : order.paymentStatus.toUpperCase(),
    transactionId: order.transactionId || order.paymentReference || null,
    invoiceNumber,
    invoiceDate,

    // Customer
    customer: {
      name: `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`.trim() || 'Valued Customer',
      email: order.userId?.email || '',
      maskedPhone,
      shippingAddress: customerShippingAddress,
      billingAddress: customerBillingAddress
    },

    // Financials
    pricing: {
      subtotal: order.subtotal || 0,
      discountAmount: order.discountAmount || 0,
      couponCode: order.couponCode || null,
      couponDiscount: order.couponDiscount || 0,
      taxAmount: order.taxAmount || 0,
      deliveryFee: order.deliveryFee || 0,
      platformFee: order.platformFee || 0,
      totalAmount: order.totalAmount || 0
    },

    // Products (No images)
    items: sanitizedItems,

    // Packages & Logistics
    packages,
    totalPackages: packages.length,
    primaryBarcode: packages[0]?.packageId || order.orderNumber,
    trackingQRUrl: qrUrl,

    // Sellers
    sellers: Object.values(sellerProfilesMap),

    // Handling Instructions
    handlingInstructions: ['HANDLE WITH CARE', 'KEEP DRY', 'THIS SIDE UP']
  };

  res.status(200).json({
    success: true,
    receipt: receiptPayload
  });
};

/**
 * @desc    Get Safe Order Label & Receipt Data for Seller (Scoped to authenticated seller)
 * @route   GET /api/seller/orders/:orderId/receipt
 * @access  Private (Seller Only - IDOR Protected)
 */
export const getSellerOrderReceipt = async (req, res) => {
  const { orderId } = req.params;

  // Resolve authenticated seller
  let seller = await Seller.findOne({ userId: req.user.id });
  if (!seller && req.user.role === 'admin') {
    // Admin checking seller route - fallback to first seller in order if available
    seller = await Seller.findOne();
  }

  if (!seller) {
    throw new ApiError(403, 'Forbidden: No seller profile found for this account');
  }

  let query;
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    query = { _id: orderId };
  } else {
    query = { orderNumber: orderId };
  }

  const order = await Order.findOne(query)
    .populate('userId', 'firstName lastName email phone')
    .lean();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // ── IDOR ENFORCEMENT & STRICT BACKEND OWNERSHIP CHECK ────────────────────────
  const sellerIdStr = seller._id.toString();
  const ownsSuborder = (order.sellerSuborders || []).some(
    (sub) => sub.sellerId?.toString() === sellerIdStr
  );
  const ownsItem = (order.items || []).some(
    (item) => item.sellerId?.toString() === sellerIdStr
  );

  if (req.user.role !== 'admin' && !ownsSuborder && !ownsItem) {
    throw new ApiError(
      403,
      'Forbidden: You do not have permission to view or print documents for this order'
    );
  }

  // Filter items strictly to this seller's products
  const myItemsRaw = (order.items || []).filter(
    (item) => item.sellerId?.toString() === sellerIdStr
  );

  // Fallback: if items array had no sellerId attached, check sellerSuborders
  let sellerItems = myItemsRaw;
  if (sellerItems.length === 0 && ownsSuborder) {
    const mySub = (order.sellerSuborders || []).find(
      (sub) => sub.sellerId?.toString() === sellerIdStr
    );
    if (mySub && mySub.items) {
      sellerItems = mySub.items;
    }
  }

  // Lookup missing SKUs if needed
  const productIdsToLookup = sellerItems
    .filter((it) => !it.sku && it.productId)
    .map((it) => it.productId);

  let productSkuMap = {};
  if (productIdsToLookup.length > 0) {
    const prods = await Product.find({ _id: { $in: productIdsToLookup } })
      .select('sku name')
      .lean();
    prods.forEach((p) => {
      productSkuMap[p._id.toString()] = p.sku;
    });
  }

  // Text-only items
  const sanitizedItems = sellerItems.map((item, idx) => {
    const sku = item.sku || productSkuMap[item.productId?.toString()] || `STY-${String(idx + 101).padStart(3, '0')}`;
    const unitPrice = item.finalPrice || item.price || 0;
    const qty = item.quantity || 1;

    return {
      itemId: item._id,
      productId: item.productId,
      name: item.productName || item.name || 'Fashion Apparel',
      sku,
      variant: item.variant || {},
      variantText: formatVariantText(item.variant),
      size: item.variant?.size || '',
      color: item.variant?.color || item.variant?.colour || '',
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty
    };
  });

  // Get seller tax & brand lock details (ALWAYS from backend Seller record)
  const sellerTaxInfo = await getSellerTaxAndBrandInfo(seller._id);

  // My suborder(s) and packages
  const mySuborders = (order.sellerSuborders || []).filter(
    (sub) => sub.sellerId?.toString() === sellerIdStr
  );

  const packages = [];
  if (mySuborders.length > 0) {
    mySuborders.forEach((sub, idx) => {
      packages.push({
        packageIndex: idx + 1,
        packageNumber: `${idx + 1}/${mySuborders.length}`,
        packageId: sub.suborderId || `PKG_${order.orderNumber}_S${sellerIdStr.slice(-4)}_${idx + 1}`,
        suborderId: sub.suborderId,
        itemsCount: (sub.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0),
        status: sub.status || order.status,
        courier: sub.trackingDetails?.carrier || order.carrier || 'Style Street Courier',
        trackingNumber: sub.trackingDetails?.trackingNumber || order.trackingNumber || '',
        deliveryMethod: sub.deliveryMethod || 'self_delivery',
        deliveryFee: sub.deliveryFee || 0,
        subtotal: sub.subtotal
      });
    });
  } else {
    packages.push({
      packageIndex: 1,
      packageNumber: '1/1',
      packageId: `PKG_${order.orderNumber}_S${sellerIdStr.slice(-4)}`,
      itemsCount: sanitizedItems.reduce((acc, it) => acc + it.quantity, 0),
      status: order.status,
      courier: order.carrier || 'Style Street Courier',
      trackingNumber: order.trackingNumber || '',
      deliveryMethod: 'self_delivery',
      deliveryFee: 0,
      subtotal: sanitizedItems.reduce((acc, it) => acc + it.totalPrice, 0)
    });
  }

  // Calculate seller subtotal
  const sellerSubtotal = sanitizedItems.reduce((acc, it) => acc + it.totalPrice, 0);

  // Calculate COD amount to collect for this seller portion if COD
  const isCOD = order.paymentMethod === 'cod';
  const codAmount = isCOD ? sellerSubtotal : 0;

  // Masked customer phone
  const rawPhone = order.shippingAddress?.phone || order.phone || order.userId?.phone || '';
  const maskedPhone = maskPhoneNumber(rawPhone);

  // Historical customer address snapshot
  const customerShippingAddress = {
    street: order.shippingAddress?.street || '',
    city: order.shippingAddress?.city || '',
    district: order.shippingAddress?.district || order.shippingAddress?.city || '',
    state: order.shippingAddress?.state || '',
    postalCode: order.shippingAddress?.postalCode || '',
    country: order.shippingAddress?.country || 'India'
  };

  const frontendOrigin = process.env.FRONTEND_URL || 'https://stylestreet.in';
  const qrUrl = `${frontendOrigin}/orders/${order.orderNumber || order._id}/track`;

  // Persistent invoice number
  let invoiceNumber = order.invoiceNumber;
  let invoiceDate = order.invoiceDate;
  if (!invoiceNumber) {
    invoiceNumber = `INV-${order.orderNumber || order._id.toString().toUpperCase()}`;
    invoiceDate = order.createdAt;
    await Order.updateOne(
      { _id: order._id },
      { $set: { invoiceNumber, invoiceDate } }
    ).catch(() => {});
  }

  const receiptPayload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    status: order.status,
    paymentMethod: order.paymentMethod ? order.paymentMethod.toUpperCase() : 'PREPAID',
    isCOD,
    codAmount,
    paymentStatus: order.paymentStatus === 'completed' ? 'PAID' : order.paymentStatus.toUpperCase(),
    invoiceNumber,
    invoiceDate,

    // Customer
    customer: {
      name: `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`.trim() || 'Customer',
      maskedPhone,
      shippingAddress: customerShippingAddress
    },

    // Seller & Approved Brand Lock
    seller: {
      sellerId: seller._id,
      brandName: sellerTaxInfo?.brandName || seller.brandName || seller.shopName,
      shopName: sellerTaxInfo?.shopName || seller.shopName,
      pickupAddress: sellerTaxInfo?.pickupAddress,
      gstin: sellerTaxInfo?.gstin || null
    },

    // Items (Only this seller's products, text only)
    items: sanitizedItems,
    subtotal: sellerSubtotal,

    // Packages & Logistics
    packages,
    totalPackages: packages.length,
    primaryBarcode: packages[0]?.packageId || `PKG_${order.orderNumber}`,
    trackingQRUrl: qrUrl,

    // Handling Instructions
    handlingInstructions: ['HANDLE WITH CARE', 'KEEP DRY', 'THIS SIDE UP']
  };

  res.status(200).json({
    success: true,
    receipt: receiptPayload
  });
};
