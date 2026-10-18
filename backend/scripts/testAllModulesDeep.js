import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true, // Don't throw on error status codes so we inspect everything
  timeout: 15000
});

const results = [];

async function testEndpoint(moduleName, endpointName, fn) {
  try {
    const res = await fn();
    if (res.pass) {
      console.log(`  ✅ [PASS] ${endpointName}: ${res.detail || 'OK'}`);
      results.push({ module: moduleName, endpoint: endpointName, status: 'PASS', detail: res.detail });
    } else {
      console.error(`  ❌ [FAIL] ${endpointName}: ${res.detail || 'Check failed'}`);
      results.push({ module: moduleName, endpoint: endpointName, status: 'FAIL', detail: res.detail });
    }
  } catch (err) {
    console.error(`  💥 [ERROR] ${endpointName}: ${err.message}`);
    results.push({ module: moduleName, endpoint: endpointName, status: 'ERROR', detail: err.message });
  }
}

async function runComprehensiveAudit() {
  console.log('\n======================================================================');
  console.log('🚀 DEEP END-TO-END MULTI-MODULE API & ACCOUNT AUDIT');
  console.log('   Target URL:', BASE_URL);
  console.log('======================================================================\n');

  // ==========================================
  // MODULE 1: PUBLIC & CATALOG ENDPOINTS
  // ==========================================
  console.log('🌐 1. AUDITING PUBLIC & CATALOG MODULE...');

  await testEndpoint('Public', 'Server Health Check (/health)', async () => {
    const res = await api.get('/health');
    return {
      pass: res.status === 200 && res.data?.success === true,
      detail: `Status ${res.status}, dbState: ${res.data?.mongodb || 'ok'}`
    };
  });

  await testEndpoint('Public', 'Root Welcome API (/)', async () => {
    const res = await api.get('/');
    return {
      pass: res.status === 200 && res.data?.success === true,
      detail: `Status ${res.status}, msg: "${res.data?.message}"`
    };
  });

  await testEndpoint('Public', 'Public Branding Config (/api/branding)', async () => {
    const res = await api.get('/api/branding');
    return {
      pass: res.status === 200 && res.data?.success === true,
      detail: `Status ${res.status}, brand: "${res.data?.branding?.brandName || 'SKLP'}"`
    };
  });

  let sampleProductId = null;
  await testEndpoint('Public', 'Catalog Products List (/api/products)', async () => {
    const res = await api.get('/api/products');
    const productDocs = res.data?.products?.docs || res.data?.products || [];
    if (productDocs.length > 0) sampleProductId = productDocs[0]._id;
    return {
      pass: res.status === 200 && Array.isArray(productDocs) && productDocs.length > 0,
      detail: `Status ${res.status}, loaded ${productDocs.length} products (sampleId: ${sampleProductId || 'none'})`
    };
  });

  await testEndpoint('Public', 'Featured Products (/api/products/featured)', async () => {
    const res = await api.get('/api/products/featured');
    return {
      pass: res.status === 200 && Array.isArray(res.data?.products),
      detail: `Status ${res.status}, count: ${res.data?.products?.length || 0}`
    };
  });

  await testEndpoint('Public', 'Trending Products (/api/products/trending)', async () => {
    const res = await api.get('/api/products/trending');
    return {
      pass: res.status === 200 && Array.isArray(res.data?.products),
      detail: `Status ${res.status}, count: ${res.data?.products?.length || 0}`
    };
  });

  await testEndpoint('Public', 'Product Categories (/api/products/categories)', async () => {
    const res = await api.get('/api/products/categories');
    return {
      pass: res.status === 200 && Array.isArray(res.data?.categories),
      detail: `Status ${res.status}, categories count: ${res.data?.categories?.length || 0}`
    };
  });

  await testEndpoint('Public', 'Search Suggestions (/api/search/suggestions?q=shirt)', async () => {
    const res = await api.get('/api/search/suggestions?q=shirt');
    return {
      pass: res.status === 200 && (Array.isArray(res.data?.suggestions) || Array.isArray(res.data?.items)),
      detail: `Status ${res.status}`
    };
  });

  await testEndpoint('Public', 'Search Execution (/api/search?q=fashion)', async () => {
    const res = await api.get('/api/search?q=fashion');
    return {
      pass: res.status === 200 && res.data?.success === true,
      detail: `Status ${res.status}, matched count: ${res.data?.count || 0}`
    };
  });

  await testEndpoint('Public', 'Active Marketplace Shops (/api/shops)', async () => {
    const res = await api.get('/api/shops');
    return {
      pass: res.status === 200 && res.data?.success === true,
      detail: `Status ${res.status}, shops count: ${res.data?.shops?.length || 0}`
    };
  });

  await testEndpoint('Public', 'Delivery Fee Calculator (/api/delivery-fee/calculate)', async () => {
    const res = await api.post('/api/delivery-fee/calculate', {
      city: 'Bangalore',
      postalCode: '560001',
      subtotal: 1200
    });
    return {
      pass: res.status === 200 && res.data?.success === true,
      detail: `Status ${res.status}, deliveryFee: ₹${res.data?.deliveryFee}, label: "${res.data?.deliveryLabel}"`
    };
  });

  // ==========================================
  // MODULE 2: AUTHENTICATION ACROSS ALL ROLES
  // ==========================================
  console.log('\n🔐 2. AUDITING MULTI-ROLE AUTHENTICATION...');
  let adminToken = '';
  let primaryAdminToken = '';
  let sellerToken = '';
  let deliveryToken = '';
  let customerToken = '';

  await testEndpoint('Auth', 'Admin Login (admin@sklp.com)', async () => {
    const res = await api.post('/api/auth/login', {
      email: 'admin@sklp.com',
      password: 'AdminPassword123!'
    });
    if (res.status === 200 && res.data?.token) {
      adminToken = res.data.token;
      return { pass: true, detail: `Status 200, role: "${res.data.user?.role}"` };
    }
    return { pass: false, detail: `Status ${res.status}, msg: ${res.data?.message}` };
  });

  await testEndpoint('Auth', 'Primary Admin Login (anjiduda77@gmail.com)', async () => {
    const res = await api.post('/api/auth/login', {
      email: 'anjiduda77@gmail.com',
      password: 'Anji7206@@'
    });
    if (res.status === 200 && res.data?.token) {
      primaryAdminToken = res.data.token;
      return { pass: true, detail: `Status 200, role: "${res.data.user?.role}"` };
    }
    return { pass: false, detail: `Status ${res.status}, msg: ${res.data?.message}` };
  });

  await testEndpoint('Auth', 'Seller Login (seller@sklp.com)', async () => {
    const res = await api.post('/api/auth/login', {
      email: 'seller@sklp.com',
      password: 'SellerPassword123!'
    });
    if (res.status === 200 && res.data?.token) {
      sellerToken = res.data.token;
      return { pass: true, detail: `Status 200, role: "${res.data.user?.role}"` };
    }
    return { pass: false, detail: `Status ${res.status}, msg: ${res.data?.message}` };
  });

  await testEndpoint('Auth', 'Delivery Partner Login (delivery@sklp.com)', async () => {
    const res = await api.post('/api/auth/login', {
      email: 'delivery@sklp.com',
      password: 'DeliveryPassword123!'
    });
    if (res.status === 200 && res.data?.token) {
      deliveryToken = res.data.token;
      return { pass: true, detail: `Status 200, role: "${res.data.user?.role}"` };
    }
    return { pass: false, detail: `Status ${res.status}, msg: ${res.data?.message}` };
  });

  await testEndpoint('Auth', 'Customer Login (customer@sklp.com)', async () => {
    const res = await api.post('/api/auth/login', {
      email: 'customer@sklp.com',
      password: 'CustomerPassword123!'
    });
    if (res.status === 200 && res.data?.token) {
      customerToken = res.data.token;
      return { pass: true, detail: `Status 200, role: "${res.data.user?.role}"` };
    }
    return { pass: false, detail: `Status ${res.status}, msg: ${res.data?.message}` };
  });

  // ==========================================
  // MODULE 3: ADMIN MODULE APIS
  // ==========================================
  console.log('\n👑 3. AUDITING ADMIN MODULE APIS...');
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  await testEndpoint('Admin', 'Dashboard Metrics (/api/admin/dashboard)', async () => {
    const res = await api.get('/api/admin/dashboard', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Products Management (/api/admin/products)', async () => {
    const res = await api.get('/api/admin/products', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, products: ${res.data?.products?.length || 0}` };
  });

  await testEndpoint('Admin', 'Orders Management (/api/admin/orders)', async () => {
    const res = await api.get('/api/admin/orders', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, orders: ${res.data?.orders?.length || 0}` };
  });

  await testEndpoint('Admin', 'Users Management (/api/admin/users)', async () => {
    const res = await api.get('/api/admin/users', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, users: ${res.data?.users?.length || 0}` };
  });

  await testEndpoint('Admin', 'Sellers Registry (/api/admin/sellers)', async () => {
    const res = await api.get('/api/admin/sellers', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, sellers: ${res.data?.sellers?.length || 0}` };
  });

  await testEndpoint('Admin', 'Seller Applications (/api/admin/seller-applications)', async () => {
    const res = await api.get('/api/admin/seller-applications', { headers: adminHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Marketplace Revenue (/api/admin/marketplace-revenue)', async () => {
    const res = await api.get('/api/admin/marketplace-revenue', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Coupons Management (/api/admin/coupons)', async () => {
    const res = await api.get('/api/admin/coupons', { headers: adminHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}, count: ${res.data?.coupons?.length || 0}` };
  });

  await testEndpoint('Admin', 'Returns Management (/api/admin/returns)', async () => {
    const res = await api.get('/api/admin/returns', { headers: adminHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Banners Management (/api/admin/banners)', async () => {
    const res = await api.get('/api/admin/banners', { headers: adminHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Notifications (/api/admin/notifications)', async () => {
    const res = await api.get('/api/admin/notifications', { headers: adminHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Notification Stats (/api/admin/notifications/stats)', async () => {
    const res = await api.get('/api/admin/notifications/stats', { headers: adminHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Campaigns Registry (/api/admin/campaigns)', async () => {
    const res = await api.get('/api/admin/campaigns', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Campaign Calendar (/api/admin/campaigns/calendar)', async () => {
    const res = await api.get('/api/admin/campaigns/calendar', { headers: adminHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Funnel Analytics (/api/admin/campaigns/funnel)', async () => {
    const res = await api.get('/api/admin/campaigns/funnel', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Reviews Moderation (/api/admin/reviews)', async () => {
    const res = await api.get('/api/admin/reviews', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Branding Settings (/api/admin/branding)', async () => {
    const res = await api.get('/api/admin/branding', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Delivery Slab Config (/api/delivery-fee/config)', async () => {
    const res = await api.get('/api/delivery-fee/config', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Admin', 'Search Analytics (/api/search/analytics)', async () => {
    const res = await api.get('/api/search/analytics', { headers: adminHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  // ==========================================
  // MODULE 4: SELLER MODULE APIS
  // ==========================================
  console.log('\n🏬 4. AUDITING SELLER MODULE APIS...');
  const sellerHeaders = { Authorization: `Bearer ${sellerToken}` };

  await testEndpoint('Seller', 'Seller Dashboard (/api/seller/dashboard)', async () => {
    const res = await api.get('/api/seller/dashboard', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Seller', 'Store Profile (/api/seller/profile)', async () => {
    const res = await api.get('/api/seller/profile', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, shop: "${res.data?.seller?.shopName || 'N/A'}"` };
  });

  await testEndpoint('Seller', 'Delivery Settings (/api/seller/delivery-settings)', async () => {
    const res = await api.get('/api/seller/delivery-settings', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Seller', 'Products List (/api/seller/products)', async () => {
    const res = await api.get('/api/seller/products', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, count: ${res.data?.products?.length || 0}` };
  });

  await testEndpoint('Seller', 'Product Offers (/api/seller/offers)', async () => {
    const res = await api.get('/api/seller/offers', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Seller', 'Orders & Suborders (/api/seller/orders)', async () => {
    const res = await api.get('/api/seller/orders', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, count: ${res.data?.orders?.length || 0}` };
  });

  await testEndpoint('Seller', 'Settlements Ledger (/api/seller/settlements)', async () => {
    const res = await api.get('/api/seller/settlements', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Seller', 'Subscription & Trial (/api/seller/subscription)', async () => {
    const res = await api.get('/api/seller/subscription', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Seller', 'Application Status (/api/seller/application/status)', async () => {
    const res = await api.get('/api/seller/application/status', { headers: sellerHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Seller', 'KYC Status (/api/seller/kyc/status)', async () => {
    const res = await api.get('/api/seller/kyc/status', { headers: sellerHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Seller', 'Shop Name Availability Check (/api/seller/check-shop-name)', async () => {
    const res = await api.get('/api/seller/check-shop-name?shopName=UniqueStyleAtelier', { headers: sellerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, available: ${res.data?.available}` };
  });

  // ==========================================
  // MODULE 5: CUSTOMER MODULE APIS
  // ==========================================
  console.log('\n🛍️  5. AUDITING CUSTOMER MODULE APIS...');
  const customerHeaders = { Authorization: `Bearer ${customerToken}` };

  await testEndpoint('Customer', 'Customer Profile (/api/users/profile)', async () => {
    const res = await api.get('/api/users/profile', { headers: customerHeaders });
    return { pass: res.status === 200 && res.data?.user?.email === 'customer@sklp.com', detail: `Status ${res.status}, email: ${res.data?.user?.email}` };
  });

  await testEndpoint('Customer', 'Current User /me (/api/users/me)', async () => {
    const res = await api.get('/api/users/me', { headers: customerHeaders });
    return { pass: res.status === 200 && res.data?.user?.role === 'customer', detail: `Status ${res.status}` };
  });

  await testEndpoint('Customer', 'Customer Addresses (/api/users/addresses)', async () => {
    const res = await api.get('/api/users/addresses', { headers: customerHeaders });
    return { pass: res.status === 200 && Array.isArray(res.data?.addresses), detail: `Status ${res.status}, addresses: ${res.data?.addresses?.length || 0}` };
  });

  await testEndpoint('Customer', 'Recently Viewed (/api/users/recently-viewed)', async () => {
    const res = await api.get('/api/users/recently-viewed', { headers: customerHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Customer', 'Customer Notifications (/api/users/notifications)', async () => {
    const res = await api.get('/api/users/notifications', { headers: customerHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  await testEndpoint('Customer', 'Shopping Cart (/api/cart)', async () => {
    const res = await api.get('/api/cart', { headers: customerHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, items: ${res.data?.cart?.items?.length || 0}` };
  });

  await testEndpoint('Customer', 'Cart Available Coupons (/api/cart/coupons)', async () => {
    const res = await api.get('/api/cart/coupons', { headers: customerHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}` };
  });

  if (sampleProductId) {
    await testEndpoint('Customer', 'Add Item to Cart (/api/cart/items)', async () => {
      const res = await api.post('/api/cart/items', { productId: sampleProductId, quantity: 1 }, { headers: customerHeaders });
      return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, cart subtotal: ₹${res.data?.cart?.subtotal || 0}` };
    });
  }

  await testEndpoint('Customer', 'Customer Wishlist (/api/wishlist)', async () => {
    const res = await api.get('/api/wishlist', { headers: customerHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}, total items: ${res.data?.wishlist?.totalItems || 0}` };
  });

  if (sampleProductId) {
    await testEndpoint('Customer', 'Add Item to Wishlist (/api/wishlist)', async () => {
      const res = await api.post('/api/wishlist', { productId: sampleProductId }, { headers: customerHeaders });
      return { pass: (res.status === 200 || res.status === 201) && res.data?.success === true, detail: `Status ${res.status}` };
    });

    await testEndpoint('Customer', 'Remove Item from Wishlist (/api/wishlist/:productId)', async () => {
      const res = await api.delete(`/api/wishlist/${sampleProductId}`, { headers: customerHeaders });
      return { pass: res.status === 200, detail: `Status ${res.status}` };
    });
  }

  await testEndpoint('Customer', 'Customer Order History (/api/orders)', async () => {
    const res = await api.get('/api/orders', { headers: customerHeaders });
    return { pass: res.status === 200, detail: `Status ${res.status}, total orders: ${res.data?.orders?.length || 0}` };
  });

  await testEndpoint('Customer', 'Document Verification (/api/orders/verify-document)', async () => {
    const res = await api.get('/api/orders/verify-document?orderId=ORD-TEST12345');
    return {
      pass: res.status === 200 && res.data?.success === true,
      detail: `Status ${res.status}, verified: ${res.data?.verified}, msg: "${res.data?.message}"`
    };
  });

  // ==========================================
  // MODULE 6: DELIVERY PARTNER MODULE APIS
  // ==========================================
  console.log('\n🚚 6. AUDITING DELIVERY PARTNER MODULE APIS...');
  const deliveryHeaders = { Authorization: `Bearer ${deliveryToken}` };

  await testEndpoint('Delivery', 'Delivery Dashboard (/api/delivery/dashboard)', async () => {
    const res = await api.get('/api/delivery/dashboard', { headers: deliveryHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Delivery', 'Assigned Orders Queue (/api/delivery/orders)', async () => {
    const res = await api.get('/api/delivery/orders', { headers: deliveryHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}, orders: ${res.data?.orders?.length || 0}` };
  });

  await testEndpoint('Delivery', 'Assigned Orders Alias (/api/delivery/assigned-orders)', async () => {
    const res = await api.get('/api/delivery/assigned-orders', { headers: deliveryHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Delivery', 'Delivery Earnings (/api/delivery/earnings)', async () => {
    const res = await api.get('/api/delivery/earnings', { headers: deliveryHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  await testEndpoint('Delivery', 'Delivery Performance Analytics (/api/delivery/analytics)', async () => {
    const res = await api.get('/api/delivery/analytics', { headers: deliveryHeaders });
    return { pass: res.status === 200 && res.data?.success === true, detail: `Status ${res.status}` };
  });

  // ==========================================
  // MODULE 7: RBAC ISOLATION & ACCESS CONTROL
  // ==========================================
  console.log('\n🛡️  7. AUDITING CROSS-ROLE RBAC ACCESS PROTECTION...');

  await testEndpoint('RBAC', 'Customer -> Admin Dashboard (403 Forbidden)', async () => {
    const res = await api.get('/api/admin/dashboard', { headers: customerHeaders });
    return { pass: res.status === 403, detail: `Status ${res.status} (Forbidden as required)` };
  });

  await testEndpoint('RBAC', 'Customer -> Seller Dashboard (403 Forbidden)', async () => {
    const res = await api.get('/api/seller/dashboard', { headers: customerHeaders });
    return { pass: res.status === 403, detail: `Status ${res.status} (Forbidden as required)` };
  });

  await testEndpoint('RBAC', 'Seller -> Admin Users List (403 Forbidden)', async () => {
    const res = await api.get('/api/admin/users', { headers: sellerHeaders });
    return { pass: res.status === 403, detail: `Status ${res.status} (Forbidden as required)` };
  });

  await testEndpoint('RBAC', 'Delivery Partner -> Admin Dashboard (403 Forbidden)', async () => {
    const res = await api.get('/api/admin/dashboard', { headers: deliveryHeaders });
    return { pass: res.status === 403, detail: `Status ${res.status} (Forbidden as required)` };
  });

  // ==========================================
  // FINAL SCORECARD
  // ==========================================
  console.log('\n======================================================================');
  console.log('📊 FINAL MULTI-MODULE AUDIT SCORECARD');
  console.log('======================================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status !== 'PASS').length;
  console.log(`TOTAL AUDIT CHECKS : ${results.length}`);
  console.log(`PASSED CHECKS      : ${passed} ✅`);
  console.log(`FAILED CHECKS      : ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`SUCCESS RATE       : ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('======================================================================\n');
}

runComprehensiveAudit();
