import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendPushNotification } from '../config/firebaseAdmin.js';

/**
 * Enterprise Centralized Notification Service
 * Supports MongoDB in-app notifications and Firebase Cloud Messaging (FCM) Web Push.
 */

/**
 * Send an in-app and push notification to a single user
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.userId Target user ID
 * @param {string} options.type Enum: order, payment, shipment, return, offer, review, account, system, seller_approved, seller_rejected, seller_info_required
 * @param {string} options.title Notification title
 * @param {string} options.message Notification body / message
 * @param {string} [options.actionUrl] Navigation link on click (e.g. /orders, /products)
 * @param {string} [options.imageUrl] Optional banner / product image
 * @param {Object} [options.relatedEntity] { entityType, entityId }
 * @returns {Promise<Object>} Created notification document
 */
export const notifyUser = async ({
  userId,
  type = 'system',
  title,
  message,
  actionUrl = '/',
  imageUrl = null,
  relatedEntity = null
}) => {
  if (!userId || !title || !message) {
    console.warn('[NOTIFICATION SERVICE] Missing required fields for notifyUser:', { userId, title });
    return null;
  }

  // Find user to get active FCM tokens
  const user = await User.findById(userId).select('fcmTokens role firstName email').lean();
  if (!user) {
    console.warn(`[NOTIFICATION SERVICE] User ${userId} not found for notification`);
    return null;
  }

  const validTokens = (user.fcmTokens || []).filter(
    t => typeof t === 'string' && t.trim().length > 10
  );

  // 1. Persist notification to MongoDB
  const notification = await Notification.create({
    userId: user._id,
    type: sanitizeNotificationType(type),
    title: title.trim(),
    message: message.trim(),
    image: imageUrl || undefined,
    actionUrl: actionUrl || undefined,
    relatedEntity: relatedEntity?.entityType && relatedEntity?.entityId ? {
      entityType: relatedEntity.entityType,
      entityId: relatedEntity.entityId
    } : undefined,
    channels: {
      inApp: true,
      push: {
        sent: validTokens.length > 0,
        sentAt: validTokens.length > 0 ? new Date() : undefined
      }
    }
  });

  // 2. Dispatch FCM Push Notification (Fail-safe, non-blocking)
  if (validTokens.length > 0) {
    try {
      await sendPushNotification({
        tokens: validTokens,
        title,
        body: message,
        imageUrl,
        data: {
          notificationId: notification._id.toString(),
          type: sanitizeNotificationType(type),
          actionUrl: actionUrl || '/',
          ...(relatedEntity?.entityId ? { relatedId: relatedEntity.entityId.toString() } : {})
        }
      });
    } catch (pushErr) {
      console.warn(`[NOTIFICATION SERVICE] Push dispatch warning for user ${userId}:`, pushErr.message);
    }
  }

  return notification;
};

/**
 * Broadcast notification to a specific role or collection of users
 * Uses chunked bulk inserts and batched FCM multicast push (up to 500 per call)
 * @param {Object} options
 * @param {string} [options.targetRole] 'all', 'customers', 'sellers', 'delivery'
 * @param {string[]} [options.userIds] Array of specific user IDs (overrides targetRole)
 * @param {string} options.type Notification type
 * @param {string} options.title Notification title
 * @param {string} options.message Notification message
 * @param {string} [options.actionUrl] Action URL
 * @param {string} [options.imageUrl] Banner/image URL
 * @returns {Promise<Object>} Statistics on created notifications and push deliveries
 */
export const broadcastNotification = async ({
  targetRole = 'all',
  userIds = null,
  type = 'system',
  title,
  message,
  actionUrl = '/',
  imageUrl = null,
  relatedEntity = null
}) => {
  if (!title || !message) {
    throw new Error('Title and message are required for broadcast');
  }

  // Determine user query
  let query = { status: { $ne: 'deleted' } };

  if (Array.isArray(userIds) && userIds.length > 0) {
    query._id = { $in: userIds };
  } else if (targetRole && targetRole !== 'all') {
    const roleNormalized = targetRole.toLowerCase().trim();
    if (['customer', 'customers'].includes(roleNormalized)) {
      query.role = 'customer';
    } else if (['seller', 'sellers'].includes(roleNormalized)) {
      query.role = 'seller';
    } else if (['delivery', 'deliverypartner', 'driver'].includes(roleNormalized)) {
      query.role = 'delivery';
    } else if (['admin', 'admins'].includes(roleNormalized)) {
      query.role = 'admin';
    }
  }

  const users = await User.find(query).select('_id fcmTokens').lean();

  if (!users || users.length === 0) {
    return {
      success: true,
      count: 0,
      pushSent: 0,
      message: 'No active users matched target criteria'
    };
  }

  const sanitizedType = sanitizeNotificationType(type);
  const now = new Date();

  // 1. Batch insert in-app notifications in chunks of 500 to prevent connection pool starvation
  const CHUNK_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const userChunk = users.slice(i, i + CHUNK_SIZE);
    const notificationsToInsert = userChunk.map(u => ({
      userId: u._id,
      type: sanitizedType,
      title: title.trim(),
      message: message.trim(),
      image: imageUrl || undefined,
      actionUrl: actionUrl || undefined,
      relatedEntity: relatedEntity?.entityType && relatedEntity?.entityId ? {
        entityType: relatedEntity.entityType,
        entityId: relatedEntity.entityId
      } : undefined,
      isRead: false,
      channels: {
        inApp: true,
        push: {
          sent: Boolean(u.fcmTokens && u.fcmTokens.length > 0),
          sentAt: now
        }
      },
      createdAt: now,
      updatedAt: now
    }));

    await Notification.insertMany(notificationsToInsert, { ordered: false });
    totalInserted += notificationsToInsert.length;
  }

  // 2. Aggregate unique FCM tokens for multicast push
  const tokenSet = new Set();
  users.forEach(u => {
    if (Array.isArray(u.fcmTokens)) {
      u.fcmTokens.forEach(t => {
        if (typeof t === 'string' && t.trim().length > 10) {
          tokenSet.add(t.trim());
        }
      });
    }
  });

  const uniqueTokens = Array.from(tokenSet);
  let pushSuccessCount = 0;
  let pushFailureCount = 0;

  // Firebase multicast supports max 500 tokens per sendEachForMulticast call
  if (uniqueTokens.length > 0) {
    for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
      const tokenBatch = uniqueTokens.slice(i, i + CHUNK_SIZE);
      try {
        const pushRes = await sendPushNotification({
          tokens: tokenBatch,
          title: title.trim(),
          body: message.trim(),
          imageUrl,
          data: {
            type: sanitizedType,
            actionUrl: actionUrl || '/'
          }
        });
        if (pushRes.successCount) pushSuccessCount += pushRes.successCount;
        if (pushRes.failureCount) pushFailureCount += pushRes.failureCount;
      } catch (batchErr) {
        console.warn('[NOTIFICATION SERVICE] Multicast batch send error:', batchErr.message);
      }
    }
  }

  return {
    success: true,
    count: totalInserted,
    pushTokensTargeted: uniqueTokens.length,
    pushSuccessCount,
    pushFailureCount,
    message: `Broadcast delivered to ${totalInserted} user(s)`
  };
};

/**
 * Domain Event: Order Status Updated
 */
export const notifyOrderStatusChanged = async (order, status, trackingDetails = {}) => {
  if (!order || !order.userId) return null;

  const orderNum = order.orderNumber || order._id.toString().slice(-6).toUpperCase();
  const readableStatus = String(status).toUpperCase();

  let title = `Order #${orderNum}: ${readableStatus}`;
  let message = `Your order status has been updated to ${status}.`;
  let type = 'order';

  switch (status.toLowerCase()) {
    case 'confirmed':
      title = `✨ Order Confirmed: #${orderNum}`;
      message = `Your order #${orderNum} has been confirmed and is being prepared with bespoke care.`;
      break;
    case 'processing':
      title = `📦 Packing Your Order: #${orderNum}`;
      message = `Your items for order #${orderNum} are packed and undergoing luxury quality inspection.`;
      break;
    case 'shipped':
      type = 'shipment';
      title = `🚚 Dispatched: Order #${orderNum} is On the Way`;
      message = trackingDetails?.trackingNumber
        ? `Shipped via ${trackingDetails.courier || 'Express'} (AWB: ${trackingDetails.trackingNumber}). Track your package anytime.`
        : `Your order #${orderNum} has shipped and is speeding towards your doorstep.`;
      break;
    case 'out_for_delivery':
      type = 'shipment';
      title = `🛵 Out for Delivery Today: #${orderNum}`;
      message = `Our courier partner is out for delivery with your order #${orderNum}. Please keep your phone nearby.`;
      break;
    case 'delivered':
      title = `🎉 Order Delivered: #${orderNum}`;
      message = `Your order #${orderNum} has been safely delivered. We hope you adore your new style!`;
      break;
    case 'cancelled':
      title = `⚠️ Order Cancelled: #${orderNum}`;
      message = `Your order #${orderNum} has been cancelled. Any payments made will be refunded to your source account.`;
      break;
    case 'returned':
    case 'return_requested':
      type = 'return';
      title = `↩️ Return Status Update: #${orderNum}`;
      message = `Your return request for order #${orderNum} is ${status.replace('_', ' ')}.`;
      break;
  }

  return notifyUser({
    userId: order.userId,
    type,
    title,
    message,
    actionUrl: `/orders`,
    relatedEntity: {
      entityType: 'order',
      entityId: order._id
    }
  });
};

/**
 * Domain Event: Seller Verification Status Changed
 */
export const notifySellerVerification = async (seller, action, notes = '') => {
  if (!seller) return null;

  const isVerified = action === 'verify';
  const type = isVerified ? 'seller_approved' : 'seller_rejected';
  const title = isVerified 
    ? '🎉 Seller Account Verified & Activated!' 
    : 'Seller Application Status Update';
  
  const message = isVerified
    ? 'Congratulations! Your Style Street seller boutique has been verified. You can now publish products and receive orders.'
    : `Your seller verification was not approved at this time. ${notes || 'Please verify your store information or contact support.'}`;

  return notifyUser({
    userId: seller._id,
    type,
    title,
    message,
    actionUrl: '/seller/dashboard',
    relatedEntity: {
      entityType: 'seller',
      entityId: seller._id
    }
  });
};

/**
 * Domain Event: Return Request Status Changed
 */
export const notifyReturnStatusChanged = async (order, action, adminNotes = '') => {
  if (!order || !order.userId) return null;

  const orderNum = order.orderNumber || order._id.toString().slice(-6).toUpperCase();
  const isApproved = action === 'approve';

  const title = isApproved
    ? `✅ Return Approved: Order #${orderNum}`
    : `Return Request Rejected: Order #${orderNum}`;

  const message = isApproved
    ? `Your return request for order #${orderNum} was approved. Our courier will contact you for pickup.`
    : `Your return request for order #${orderNum} could not be approved. ${adminNotes || 'Please review our return policy.'}`;

  return notifyUser({
    userId: order.userId,
    type: 'return',
    title,
    message,
    actionUrl: '/orders',
    relatedEntity: {
      entityType: 'order',
      entityId: order._id
    }
  });
};

/**
 * Validate and sanitize notification type against schema enum
 */
function sanitizeNotificationType(type) {
  const allowed = [
    'order', 'payment', 'shipment', 'return', 'offer', 
    'review', 'account', 'system', 'seller_approved', 
    'seller_rejected', 'seller_info_required',
    'seller_suspended', 'seller_reactivated'
  ];
  return allowed.includes(type) ? type : 'system';
}

export default {
  notifyUser,
  broadcastNotification,
  notifyOrderStatusChanged,
  notifySellerVerification,
  notifyReturnStatusChanged
};
