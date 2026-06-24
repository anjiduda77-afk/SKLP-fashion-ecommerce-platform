import Order from '../models/Order.js'
import { ApiError } from '../middleware/errorHandler.js'

/**
 * Get delivery partner dashboard stats
 */
export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id

    // Get today's deliveries count
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayDeliveries = await Order.countDocuments({
      assignedTo: userId,
      status: { $in: ['out_for_delivery', 'delivered'] },
      updatedAt: { $gte: today }
    })

    // Get pending deliveries
    const pendingDeliveries = await Order.countDocuments({
      assignedTo: userId,
      status: { $in: ['confirmed', 'out_for_delivery'] }
    })

    // Calculate earnings (simplified - adjust based on your business logic)
    const completedOrders = await Order.aggregate([
      {
        $match: {
          assignedTo: userId,
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: { $multiply: ['$totalAmount', 0.05] } // 5% commission
          },
          completedCount: { $sum: 1 }
        }
      }
    ])

    const stats = {
      totalDeliveries: completedOrders[0]?.completedCount || 0,
      todayDeliveries,
      pendingDeliveries,
      totalEarnings: completedOrders[0]?.totalEarnings || 0,
      rating: 4.5 // Placeholder - update with actual rating from database
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard stats retrieved',
      data: stats
    })
  } catch (error) {
    throw new ApiError(500, `Failed to fetch dashboard: ${error.message}`)
  }
}

/**
 * Get orders assigned to delivery partner
 */
export const getAssignedOrders = async (req, res) => {
  try {
    const userId = req.user.id
    const { status, page = 1, limit = 10 } = req.query

    const query = {
      assignedTo: userId
    }

    if (status) {
      query.status = status
    } else {
      query.status = { $in: ['confirmed', 'out_for_delivery', 'ready_for_pickup'] }
    }

    const skip = (page - 1) * limit

    const orders = await Order.find(query)
      .populate('userId', 'firstName lastName phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    const total = await Order.countDocuments(query)

    res.status(200).json({
      success: true,
      message: 'Assigned orders retrieved',
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    throw new ApiError(500, `Failed to fetch orders: ${error.message}`)
  }
}

/**
 * Update order delivery status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params
    const { status, notes, otp } = req.body
    const userId = req.user.id

    // Validate status
    const validStatuses = [
      'confirmed',
      'out_for_delivery',
      'ready_for_pickup',
      'delivered',
      'failed_delivery'
    ]
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status: ${status}`)
    }

    // Find order
    const order = await Order.findById(orderId)
    if (!order) {
      throw new ApiError(404, 'Order not found')
    }

    // Verify assignment
    if (order.assignedTo.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to update this order')
    }

    // Update order
    order.status = status
    if (notes) order.deliveryNotes = notes
    if (otp) order.deliveryOTP = otp
    order.updatedAt = new Date()

    // Track status change
    if (!order.statusHistory) order.statusHistory = []
    order.statusHistory.push({
      status,
      updatedAt: new Date(),
      updatedBy: userId
    })

    await order.save()

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      order
    })
  } catch (error) {
    throw new ApiError(500, `Failed to update order: ${error.message}`)
  }
}

/**
 * Update delivery location
 */
export const updateDeliveryLocation = async (req, res) => {
  try {
    const { orderId } = req.params
    const { latitude, longitude } = req.body
    const userId = req.user.id

    if (!latitude || !longitude) {
      throw new ApiError(400, 'Latitude and longitude are required')
    }

    const order = await Order.findById(orderId)
    if (!order) {
      throw new ApiError(404, 'Order not found')
    }

    if (order.assignedTo.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to update this order')
    }

    order.deliveryLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    }
    order.lastLocationUpdate = new Date()

    await order.save()

    res.status(200).json({
      success: true,
      message: 'Delivery location updated',
      location: order.deliveryLocation
    })
  } catch (error) {
    throw new ApiError(500, `Failed to update location: ${error.message}`)
  }
}

/**
 * Get delivery partner earnings
 */
export const getEarnings = async (req, res) => {
  try {
    const userId = req.user.id
    const { period = 'month' } = req.query

    let dateFilter
    const now = new Date()

    if (period === 'week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = { $gte: lastWeek }
    } else if (period === 'month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      dateFilter = { $gte: lastMonth }
    } else if (period === 'year') {
      const lastYear = new Date(now.getFullYear() - 1, 0, 1)
      dateFilter = { $gte: lastYear }
    }

    const earnings = await Order.aggregate([
      {
        $match: {
          assignedTo: userId,
          status: 'delivered',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: { $multiply: ['$totalAmount', 0.05] }
          },
          deliveryCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ])

    // Get pending earnings
    const pendingEarnings = await Order.aggregate([
      {
        $match: {
          assignedTo: userId,
          status: 'out_for_delivery'
        }
      },
      {
        $group: {
          _id: null,
          pendingAmount: {
            $sum: { $multiply: ['$totalAmount', 0.05] }
          }
        }
      }
    ])

    res.status(200).json({
      success: true,
      message: 'Earnings data retrieved',
      data: {
        period,
        totalEarnings: earnings[0]?.totalEarnings || 0,
        deliveryCount: earnings[0]?.deliveryCount || 0,
        averageOrderValue: earnings[0]?.averageOrderValue || 0,
        pendingEarnings: pendingEarnings[0]?.pendingAmount || 0
      }
    })
  } catch (error) {
    throw new ApiError(500, `Failed to fetch earnings: ${error.message}`)
  }
}

/**
 * Get delivery analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id

    const stats = await Order.aggregate([
      {
        $match: { assignedTo: userId }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const statusMap = {}
    stats.forEach(stat => {
      statusMap[stat._id] = stat.count
    })

    res.status(200).json({
      success: true,
      message: 'Analytics retrieved',
      data: statusMap
    })
  } catch (error) {
    throw new ApiError(500, `Failed to fetch analytics: ${error.message}`)
  }
}
