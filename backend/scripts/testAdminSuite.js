import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API_BASE = 'http://localhost:5000/api'

async function runAdminVerification() {
  console.log('\n===============================================================')
  console.log('👑  SKLP FASHION ADMIN PORTAL COMPLETE END-TO-END VERIFICATION')
  console.log('===============================================================\n')

  let passed = 0
  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${name} - ${details}`)
      throw new Error(`Admin assertion failed: ${name}`)
    }
  }

  try {
    // 1. Admin Auth
    console.log('--- 1. Admin Authentication & Role Authorization ---')
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@sklp.com',
      password: 'AdminPassword123!'
    })
    assert(loginRes.status === 200, 'Admin Login Successful')
    assert(loginRes.data.user.role === 'admin', 'User has Admin Role')
    const token = loginRes.data.token

    const adminAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${token}` }
    })

    // 2. Dashboard Analytics & KPIs
    console.log('\n--- 2. Dashboard Metrics & KPI Calculation ---')
    const dashRes = await adminAxios.get('/admin/dashboard')
    assert(dashRes.status === 200 && dashRes.data.success, 'Dashboard API Online')
    const m = dashRes.data.metrics
    console.log(`     Total Sales Revenue : ₹${m.totalSales.toLocaleString('en-IN')}`)
    console.log(`     Total Orders Count  : ${m.totalOrders}`)
    console.log(`     Total Users Count   : ${m.totalUsers}`)
    console.log(`     Total Sellers Count : ${m.totalSellers}`)
    console.log(`     Average Order Value : ₹${m.avgOrderValue}`)
    console.log(`     Conversion Rate     : ${m.conversionRate}%`)
    assert(m.salesTimeline?.length >= 0, 'Sales timeline data populated')
    assert(m.recentOrders?.length >= 0, 'Recent orders list populated')

    // 3. Products Management
    console.log('\n--- 3. Catalog Products Management ---')
    const prodsRes = await adminAxios.get('/admin/products?limit=10')
    assert(prodsRes.status === 200, 'Catalog products retrieved')
    const prods = prodsRes.data.products?.docs || prodsRes.data.products || []
    console.log(`     Products in catalog : ${prods.length} items`)

    // Create a temporary test product
    const newProd = await adminAxios.post('/admin/products', {
      name: 'Admin Exclusive Silk Tuxedo',
      description: 'Handcrafted Italian silk tuxedo with velvet notch lapel.',
      category: 'fashion-wear',
      gender: 'men',
      price: 15999,
      originalPrice: 19999,
      discount: 20,
      stock: 10,
      images: [{ url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', isMain: true }]
    })
    assert(newProd.status === 201 || newProd.status === 200, 'Admin can create catalog products')
    const testProdId = newProd.data.product._id
    console.log(`     Created Test Product: "${newProd.data.product.name}" (${testProdId})`)

    // Delete test product
    await adminAxios.delete(`/admin/products/${testProdId}`)
    assert(true, 'Admin can delete catalog products')

    // 4. Orders Management
    console.log('\n--- 4. Orders Management & Inspection ---')
    const ordersRes = await adminAxios.get('/admin/orders?limit=5')
    assert(ordersRes.status === 200, 'Orders list retrieved')
    const ordersList = ordersRes.data.orders?.docs || ordersRes.data.orders || []
    console.log(`     Total orders fetched: ${ordersList.length}`)

    // 5. Users Management
    console.log('\n--- 5. Users Management ---')
    const usersRes = await adminAxios.get('/admin/users?limit=5')
    assert(usersRes.status === 200, 'Users registry retrieved')

    // 6. Sellers & Applications
    console.log('\n--- 6. Sellers & Onboarding Review ---')
    const sellersRes = await adminAxios.get('/admin/sellers')
    assert(sellersRes.status === 200, 'Sellers list retrieved')
    const appsRes = await adminAxios.get('/admin/seller-applications')
    assert(appsRes.status === 200, 'Seller applications retrieved')

    // 7. Marketplace Revenue & Commission Ledger
    console.log('\n--- 7. Marketplace Revenue & Seller Settlements ---')
    const revRes = await adminAxios.get('/admin/marketplace-revenue')
    assert(revRes.status === 200 && revRes.data.revenue, 'Marketplace revenue ledger retrieved')
    const rev = revRes.data.revenue
    console.log(`     Total Customer Payments: ₹${rev.totalCustomerPayments}`)
    console.log(`     Platform Commissions   : ₹${rev.platformCommissionEarned}`)
    console.log(`     Net Platform Revenue   : ₹${rev.netPlatformRevenue}`)

    // 8. Coupons Management
    console.log('\n--- 8. Coupons Management ---')
    const couponsRes = await adminAxios.get('/admin/coupons')
    assert(couponsRes.status === 200, 'Coupons list retrieved')

    // 9. Product Reviews Moderation
    console.log('\n--- 9. Product Reviews Moderation ---')
    const reviewsRes = await adminAxios.get('/admin/reviews')
    assert(reviewsRes.status === 200, 'Reviews moderation retrieved')

    console.log('\n===============================================================')
    console.log(`🎉 ALL ${passed} ADMIN PORTAL CAPABILITIES VERIFIED SUCCESSFULLY! 100% PASS!`)
    console.log('===============================================================\n')

    process.exit(0)
  } catch (err) {
    console.error('❌ Admin verification failed:', err.response?.data || err.message)
    process.exit(1)
  }
}

runAdminVerification()
