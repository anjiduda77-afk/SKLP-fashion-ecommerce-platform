import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true // Allow handling all status codes
});

const results = [];

async function runCheck(name, fn) {
  try {
    const res = await fn();
    if (res.pass) {
      results.push({ name, status: 'PASS', detail: res.detail });
      console.log(`✅ [PASS] ${name}: ${res.detail}`);
    } else {
      results.push({ name, status: 'FAIL', detail: res.detail });
      console.log(`❌ [FAIL] ${name}: ${res.detail}`);
    }
  } catch (err) {
    results.push({ name, status: 'ERROR', detail: err.message });
    console.log(`💥 [ERROR] ${name}: ${err.message}`);
  }
}

async function testAllApis() {
  console.log('\n🔍 ================== STARTING FULL API AUDIT CHECK ==================\n');

  // 1. Health
  await runCheck('1. Server Health Check', async () => {
    const res = await api.get('/health');
    return {
      pass: res.status === 200 && res.data.status === 'ok',
      detail: `Status ${res.status}, uptime: ${res.data.uptime?.toFixed(1)}s`
    };
  });

  // 2. Root
  await runCheck('2. Root Welcome API', async () => {
    const res = await api.get('/');
    return {
      pass: res.status === 200 && res.data.success === true,
      detail: `Status ${res.status}, message: "${res.data.message}"`
    };
  });

  // 3. Products List
  await runCheck('3. Public Products API', async () => {
    const res = await api.get('/api/products');
    const count = Array.isArray(res.data?.products) ? res.data.products.length : (res.data?.products?.docs?.length || 0);
    return {
      pass: res.status === 200 && count > 0,
      detail: `Status ${res.status}, loaded ${count} products (total: ${res.data?.products?.totalDocs || count})`
    };
  });

  // 4. Admin Auth
  let adminToken = '';
  await runCheck('4. Admin Login (/api/auth/login)', async () => {
    const res = await api.post('/api/auth/login', {
      email: 'admin@sklp.com',
      password: 'AdminPassword123!'
    });
    if (res.status === 200 && res.data?.token) {
      adminToken = res.data.token;
      return {
        pass: true,
        detail: `Status 200, role: "${res.data.user?.role}", token issued: ${res.data.token.slice(0, 15)}...`
      };
    }
    return { pass: false, detail: `Status ${res.status}, msg: ${res.data?.message}` };
  });

  // 5. Customer Auth
  let customerToken = '';
  await runCheck('5. Customer Login (/api/auth/login)', async () => {
    const res = await api.post('/api/auth/login', {
      email: 'customer@sklp.com',
      password: 'CustomerPassword123!'
    });
    if (res.status === 200 && res.data?.token) {
      customerToken = res.data.token;
      return {
        pass: true,
        detail: `Status 200, customUserId: "${res.data.user?.customUserId || 'N/A'}", role: "${res.data.user?.role}"`
      };
    }
    return { pass: false, detail: `Status ${res.status}, msg: ${res.data?.message}` };
  });

  // 6. Mobile Send OTP (Security Check: Ensure NO OTP is leaked in response)
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  await runCheck('6. Send OTP (/api/auth/send-otp) Security Verification', async () => {
    const res = await api.post('/api/auth/send-otp', { phone: testPhone });
    const hasOtpLeaked = Boolean(res.data.otp || res.data.otpCode || res.data.code);
    return {
      pass: res.status === 200 && !hasOtpLeaked,
      detail: `Status ${res.status}, message: "${res.data.message}", OTP Leaked in JSON: ${hasOtpLeaked ? 'YES (FAIL)' : 'NO (SECURE)'}`
    };
  });

  // 7. Verify OTP (Wrong code should return customer-friendly 400)
  await runCheck('7. Verify OTP (/api/auth/verify-otp) Incorrect Code Handling', async () => {
    const res = await api.post('/api/auth/verify-otp', { phone: testPhone, otp: '000000' });
    return {
      pass: res.status === 400 && res.data.message === 'Incorrect OTP. Please try again.',
      detail: `Status ${res.status}, friendly error: "${res.data.message}"`
    };
  });

  // 8. Customer Profile
  await runCheck('8. Customer Profile (/api/users/profile)', async () => {
    const res = await api.get('/api/users/profile', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    return {
      pass: res.status === 200 && res.data?.user?.email === 'customer@sklp.com',
      detail: `Status ${res.status}, email: ${res.data?.user?.email}, addresses count: ${res.data?.user?.addresses?.length || 0}`
    };
  });

  // 9. Customer Cart
  await runCheck('9. Customer Cart (/api/cart)', async () => {
    const res = await api.get('/api/cart', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    return {
      pass: res.status === 200,
      detail: `Status ${res.status}, items: ${res.data?.cart?.items?.length || 0}`
    };
  });

  // 10. Customer Wishlist
  await runCheck('10. Customer Wishlist (/api/wishlist)', async () => {
    const res = await api.get('/api/wishlist', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    return {
      pass: res.status === 200,
      detail: `Status ${res.status}, wishlist items: ${res.data?.wishlist?.products?.length || 0}`
    };
  });

  // 11. Admin Metrics
  await runCheck('11. Admin Metrics (/api/admin/dashboard)', async () => {
    const res = await api.get('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return {
      pass: res.status === 200 && res.data?.success === true,
      detail: `Status ${res.status}, metrics keys: ${Object.keys(res.data?.metrics || {}).slice(0, 5).join(', ')}`
    };
  });

  // 12. Admin Users Management
  await runCheck('12. Admin Users List (/api/admin/users)', async () => {
    const res = await api.get('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const usersCount = res.data?.users?.length || 0;
    return {
      pass: res.status === 200 && usersCount > 0,
      detail: `Status ${res.status}, total accounts in DB: ${usersCount}`
    };
  });

  // 13. RBAC Gating: Customer trying to access Admin API (Should be 403 Forbidden)
  await runCheck('13. RBAC Protection: Customer accessing Admin endpoint', async () => {
    const res = await api.get('/api/admin/users', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    return {
      pass: res.status === 403,
      detail: `Status ${res.status} (Forbidden as expected), msg: "${res.data?.message}"`
    };
  });

  // Summary
  console.log('\n================== API AUDIT RESULTS ==================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status !== 'PASS').length;
  console.log(`📊 TOTAL CHECKS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================\n');
}

testAllApis();
