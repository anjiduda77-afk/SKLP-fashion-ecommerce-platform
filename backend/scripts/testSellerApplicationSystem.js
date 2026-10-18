import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('🚀 Running Seller Application System End-to-End Verification...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  try {
    // 1. Admin Login
    console.log('👑 1. Authenticating Admin...');
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@sklp.com',
      password: 'AdminPassword123!'
    });
    const adminToken = adminLoginRes.data.accessToken || adminLoginRes.data.token;
    assert(!!adminToken, 'Admin authenticated and received JWT token');

    const adminAxios = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 2. Customer Login (For RBAC check)
    console.log('🛍️ 2. Authenticating Customer...');
    const custLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'customer@sklp.com',
      password: 'CustomerPassword123!'
    });
    const custToken = custLoginRes.data.accessToken || custLoginRes.data.token;
    assert(!!custToken, 'Customer authenticated');

    const custAxios = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${custToken}` }
    });

    // 3. Fetch Seller Applications List
    console.log('\n📋 3. Fetching Applications List...');
    const listRes = await adminAxios.get('/admin/seller-applications');
    assert(listRes.status === 200, 'Applications list returned HTTP 200');
    assert(Array.isArray(listRes.data.applications), 'Applications payload is an array');
    console.log(`     Total applications retrieved: ${listRes.data.applications.length}`);

    if (listRes.data.applications.length > 0) {
      const sampleApp = listRes.data.applications[0];
      const appId = sampleApp._id || sampleApp.id;
      console.log(`     Testing single details on application ID: ${appId} (${sampleApp.shopName})`);

      // 4. Fetch Single Application Details
      console.log('\n🔍 4. Testing Single Application Details Endpoint (/admin/seller-applications/:id)...');
      const detailRes = await adminAxios.get(`/admin/seller-applications/${appId}`);
      assert(detailRes.status === 200, 'Single application returned HTTP 200');
      assert(detailRes.data.success === true, 'Response success is true');
      assert(!!detailRes.data.application, 'Application payload present');
      assert(detailRes.data.application._id.toString() === appId.toString(), 'Application ID matches query');
      assert(typeof detailRes.data.application.shopName === 'string', `Shop Name present: "${detailRes.data.application.shopName}"`);
      assert(typeof detailRes.data.application.businessType === 'string', `Business Type present: "${detailRes.data.application.businessType}"`);
      assert(Array.isArray(detailRes.data.application.shopImages), `Shop Images array present (${detailRes.data.application.shopImages.length} images)`);

      // 5. Test Agreement PDF Generation
      console.log('\n📄 5. Testing Agreement PDF Generation (/admin/seller-applications/:id/agreement-pdf)...');
      const pdfRes = await adminAxios.get(`/admin/seller-applications/${appId}/agreement-pdf`, {
        responseType: 'arraybuffer'
      });
      assert(pdfRes.status === 200, 'PDF endpoint returned HTTP 200');
      assert(pdfRes.headers['content-type'] === 'application/pdf', 'Header content-type is application/pdf');
      assert(pdfRes.data.length > 1000, `Generated PDF binary size: ${pdfRes.data.length} bytes`);

      // 6. Test RBAC: Customer accessing admin application endpoint
      console.log('\n🛡️ 6. Testing RBAC Access Control on Details Endpoint...');
      try {
        await custAxios.get(`/admin/seller-applications/${appId}`);
        assert(false, 'Customer was able to access admin seller application endpoint (should fail)');
      } catch (rbacErr) {
        assert(rbacErr.response?.status === 403, 'Customer blocked with 403 Forbidden as required');
      }

      // 7. Test RBAC on Agreement PDF
      try {
        await custAxios.get(`/admin/seller-applications/${appId}/agreement-pdf`);
        assert(false, 'Customer was able to access admin agreement PDF endpoint (should fail)');
      } catch (rbacErr) {
        assert(rbacErr.response?.status === 403, 'Customer blocked from PDF with 403 Forbidden as required');
      }

      // 8. Test Review Workflow: Request Correction
      console.log('\n🔄 7. Testing Review Workflow (Request Correction & Status Synchronization)...');
      const reviewRes = await adminAxios.put(`/admin/seller-applications/${appId}/review`, {
        action: 'NEEDS_CORRECTION',
        notes: 'Compliance check: Please ensure shopfront photograph displays legible signage.'
      });
      assert(reviewRes.status === 200, 'Review action returned HTTP 200');
      assert(reviewRes.data.application.status === 'NEEDS_CORRECTION', 'Application status updated to NEEDS_CORRECTION');
      assert(reviewRes.data.application.correctionReason.includes('legible signage'), 'Correction reason persisted in database');

      // Verify re-fetch reflects updated status
      const updatedRes = await adminAxios.get(`/admin/seller-applications/${appId}`);
      assert(updatedRes.data.application.status === 'NEEDS_CORRECTION', 'Re-fetched application reflects NEEDS_CORRECTION');
      assert(Array.isArray(updatedRes.data.application.auditLogs) && updatedRes.data.application.auditLogs.length > 0, 'Audit log created with timestamp and administrator action');
    }

    console.log('\n======================================================================');
    console.log(`🎉 TEST SUMMARY: ${passed}/${total} CHECKS PASSED (${Math.round(passed/total * 100)}%)`);
    console.log('======================================================================\n');
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('💥 Test suite encountered unhandled error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTest();
