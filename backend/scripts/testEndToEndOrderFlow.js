import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API_BASE = 'http://localhost:5000/api'

async function runEndToEndOrderFlowTest() {
  console.log('\n======================================================================')
  console.log('🚀 STYREET COMPLETE ORDER LIFECYCLE: E2E VERIFICATION & AUDIT')
  console.log('======================================================================\n')

  let passed = 0
  let failed = 0

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${title}: ${details}`)
      failed++
    }
  }

  try {
    // ──────────────────────────────────────────────────────────────────
    // STEP 1: ADMIN LOGIN WITH anjiduda77@gmail.com / Anji7206@@
    // ──────────────────────────────────────────────────────────────────
    console.log('👑 STEP 1: Verifying Admin Account (anjiduda77@gmail.com)...')
    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'anjiduda77@gmail.com',
      password: 'Anji7206@@'
    })
    assert(adminLoginRes.status === 200, 'Admin Authentication with anjiduda77@gmail.com')
    assert(adminLoginRes.data.user.role === 'admin', 'Admin Role matches "admin"')
    const adminToken = adminLoginRes.data.token
    const adminClient = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${adminToken}` }
    })

    // ──────────────────────────────────────────────────────────────────
    // STEP 2: SELLER LOGIN & PRODUCT READINESS (seller@sklp.com)
    // ──────────────────────────────────────────────────────────────────
    console.log('\n🏬 STEP 2: Seller Login & Product Readiness (seller@sklp.com)...')
    const sellerLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'seller@sklp.com',
      password: 'SellerPassword123!'
    })
    assert(sellerLoginRes.status === 200, 'Seller Authentication (seller@sklp.com)')
    const sellerToken = sellerLoginRes.data.token
    const sellerClient = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${sellerToken}` }
    })

    // Verify or ensure seller product
    let sellerProductsRes = await sellerClient.get('/seller/products')
    let testProduct = sellerProductsRes.data.products?.[0]

    if (!testProduct) {
      console.log('  ℹ️ Creating a showcase product for seller...')
      const newProdRes = await sellerClient.post('/seller/products', {
        name: 'STYREET Royal Silk Kurta Set',
        description: 'Handcrafted premium silk kurta set with intricate embroidery.',
        shortDescription: 'Royal handcrafted silk kurta set',
        category: 'fashion-wear',
        subcategory: 'Ethnic Wear',
        gender: 'men',
        price: 1999,
        originalPrice: 2999,
        discount: 33,
        stock: 50,
        lowStockThreshold: 5,
        tags: ['ethnic', 'silk', 'designer'],
        images: [
          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'
        ]
      })
      testProduct = newProdRes.data.product
    }
    assert(!!testProduct && testProduct._id, `Seller Product Ready: "${testProduct.name}" (ID: ${testProduct._id})`)

    // ──────────────────────────────────────────────────────────────────
    // STEP 3: CUSTOMER LOGIN & ORDER PLACEMENT (customer@sklp.com)
    // ──────────────────────────────────────────────────────────────────
    console.log('\n🛍️ STEP 3: Customer Order Placement (customer@sklp.com)...')
    const customerLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'customer@sklp.com',
      password: 'CustomerPassword123!'
    })
    assert(customerLoginRes.status === 200, 'Customer Authentication (customer@sklp.com)')
    const customerToken = customerLoginRes.data.token
    const customerClient = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${customerToken}` }
    })

    // Add product to cart
    console.log('  🛒 Adding product to Customer cart...')
    const addToCartRes = await customerClient.post('/cart/items', {
      productId: testProduct._id,
      quantity: 1
    })
    assert(addToCartRes.status === 200, 'Product added to Customer Cart')

    // Create Order
    console.log('  📦 Submitting Checkout Order...')
    const orderPayload = {
      shippingAddress: {
        street: 'Banjara Hills, Road No 12',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500034',
        country: 'India'
      },
      paymentMethod: 'cod',
      phone: '9876543210'
    }

    const createOrderRes = await customerClient.post('/orders', orderPayload)
    assert(createOrderRes.status === 201, 'Order Created Successfully (HTTP 201)')
    const createdOrder = createOrderRes.data.order
    assert(!!createdOrder.orderNumber, `Order Number generated: ${createdOrder.orderNumber}`)
    assert(createdOrder.sellerSuborders?.length > 0, `Suborders generated (${createdOrder.sellerSuborders?.length})`)
    const suborder = createdOrder.sellerSuborders[0]
    console.log(`    Order ID: ${createdOrder._id}`)
    console.log(`    Suborder ID: ${suborder?.suborderId}`)
    console.log(`    Total Amount: ₹${createdOrder.totalAmount} (Subtotal: ₹${createdOrder.subtotal}, Delivery: ₹${createdOrder.deliveryFee})`)

    // ──────────────────────────────────────────────────────────────────
    // STEP 4: SELLER VIEWS & DISPATCHES SUBORDER
    // ──────────────────────────────────────────────────────────────────
    console.log('\n🏬 STEP 4: Seller Suborder Processing & Dispatch...')
    const sellerOrdersRes = await sellerClient.get('/seller/orders')
    assert(sellerOrdersRes.status === 200, 'Seller fetched orders list')
    const mySuborder = sellerOrdersRes.data.orders.find(o => o.orderId === createdOrder._id || o.suborderId === suborder.suborderId)
    assert(!!mySuborder, `Seller found suborder ${suborder.suborderId} in their queue`)

    console.log('  🚚 Seller Dispatching Suborder...')
    const dispatchRes = await sellerClient.put(`/seller/orders/${createdOrder._id}/dispatch`, {
      suborderId: suborder.suborderId,
      carrier: 'STYREET Express Logistics',
      trackingNumber: `STR-TRK-${Date.now().toString().slice(-6)}`
    })
    assert(dispatchRes.status === 200, 'Seller successfully dispatched suborder')
    assert(dispatchRes.data.suborder.status === 'shipped', 'Suborder status transitioned to "shipped"')

    // ──────────────────────────────────────────────────────────────────
    // STEP 5: DELIVERY PARTNER PICKUP & MARK DELIVERED
    // ──────────────────────────────────────────────────────────────────
    console.log('\n🚚 STEP 5: Delivery Partner Acceptance & Doorstep Delivery...')
    const deliveryLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'delivery@sklp.com',
      password: 'DeliveryPassword123!'
    })
    assert(deliveryLoginRes.status === 200, 'Delivery Partner Authentication (delivery@sklp.com)')
    const deliveryToken = deliveryLoginRes.data.token
    const deliveryClient = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${deliveryToken}` }
    })

    // Fetch assigned orders
    const deliveryOrdersRes = await deliveryClient.get('/delivery/orders')
    assert(deliveryOrdersRes.status === 200, 'Delivery Partner fetched orders queue')

    // Partner updates order to "out_for_delivery"
    console.log('  📍 Transitioning order to OUT FOR DELIVERY...')
    const outForDeliveryRes = await deliveryClient.put(`/delivery/orders/${createdOrder._id}/status`, {
      status: 'out_for_delivery',
      notes: 'Out for doorstep delivery with delivery agent'
    })
    assert(outForDeliveryRes.status === 200, 'Order status updated to "out_for_delivery"')
    const deliveryOTP = outForDeliveryRes.data.order?.deliveryOTP
    assert(!!deliveryOTP, `Delivery OTP generated for secure handoff: ${deliveryOTP}`)

    // Partner updates order to "delivered" with OTP
    console.log('  🎁 Completing delivery with Doorstep OTP verification...')
    const deliveredRes = await deliveryClient.put(`/delivery/orders/${createdOrder._id}/status`, {
      status: 'delivered',
      otp: deliveryOTP,
      notes: 'Handed over to customer safely'
    })
    assert(deliveredRes.status === 200, 'Order successfully marked "delivered"')
    assert(deliveredRes.data.order.status === 'delivered', 'Final Order Status is "delivered"')
    assert(deliveredRes.data.order.paymentStatus === 'completed', 'Payment Status marked "completed"')

    // ──────────────────────────────────────────────────────────────────
    // STEP 6: CUSTOMER VERIFIES TRACKING & RECEIPT
    // ──────────────────────────────────────────────────────────────────
    console.log('\n📱 STEP 6: Customer Order Tracking Verification...')
    const trackRes = await customerClient.get(`/orders/${createdOrder._id}/track`)
    assert(trackRes.status === 200, 'Customer order tracking retrieved')
    assert(trackRes.data.tracking.status === 'delivered', 'Customer tracking confirms "delivered"')
    assert(trackRes.data.tracking.statusHistory?.length >= 2, `Tracking history recorded (${trackRes.data.tracking.statusHistory?.length} events)`)

    // ──────────────────────────────────────────────────────────────────
    // STEP 7: ADMIN (anjiduda77@gmail.com) ORDERS & SETTLEMENTS AUDIT
    // ──────────────────────────────────────────────────────────────────
    console.log('\n👑 STEP 7: Admin Verification (anjiduda77@gmail.com)...')
    const adminOrdersRes = await adminClient.get('/admin/orders')
    assert(adminOrdersRes.status === 200, 'Admin Orders API queried successfully')
    const adminOrderMatch = adminOrdersRes.data.orders?.find(o => o._id === createdOrder._id)
    assert(!!adminOrderMatch, `Admin can view Order #${createdOrder.orderNumber}`)
    assert(adminOrderMatch?.status === 'delivered', 'Admin sees Order status as "delivered"')

    const adminRevenueRes = await adminClient.get('/admin/marketplace-revenue')
    assert(adminRevenueRes.status === 200, 'Admin Marketplace Revenue & Settlements accessible')

    // ──────────────────────────────────────────────────────────────────
    // SUMMARY
    // ──────────────────────────────────────────────────────────────────
    console.log('\n======================================================================')
    console.log(`🏁 FULL ORDER PROCESS AUDIT: ${passed} PASSED | ${failed} FAILED`)
    console.log('======================================================================\n')

    if (failed > 0) process.exit(1)
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Unhandled error in End-to-End order process test:', error.response?.data || error.message)
    process.exit(1)
  }
}

runEndToEndOrderFlowTest()
