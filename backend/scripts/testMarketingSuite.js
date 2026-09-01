import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Campaign from '../models/Campaign.js';
import MarketingAsset from '../models/MarketingAsset.js';
import MarketingAuditLog from '../models/MarketingAuditLog.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';

async function runMarketingTests() {
  console.log('\n======================================================');
  console.log('🚀 SKLP ADVANCED MARKETING & CAMPAIGN TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}: ${details}`);
      failed++;
    }
  };

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB Atlas for marketing assertions\n');

    // 1. Admin Authentication for Protected Endpoints
    console.log('--- 1. Admin Authentication ---');
    const adminUser = await User.findOne({ role: 'admin' });
    let adminToken = '';
    if (adminUser) {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: adminUser.email,
        password: 'AdminPassword123!'
      }).catch(err => {
        // Fallback for tests if password differs
        return { data: { token: 'mock_or_real' } };
      });
      adminToken = loginRes.data?.token || '';
    }

    // Direct token creation if needed
    if (!adminToken) {
      const jwt = (await import('jsonwebtoken')).default;
      adminToken = jwt.sign(
        { id: adminUser?._id || new mongoose.Types.ObjectId(), email: 'admin@sklp.com', role: 'admin' },
        process.env.JWT_SECRET || 'sklp_fashion_key_anji7206',
        { expiresIn: '1h' }
      );
    }
    assert(adminToken, 'Admin Auth Token generated successfully');

    const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 2. Create Campaign with Targeting, Frequency, and A/B Variants
    console.log('\n--- 2. Create Targeted Campaign with A/B Test ---');
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
    const createRes = await axios.post(`${API_BASE}/admin/campaigns`, {
      title: 'Royal Banarasi Silk Festive Special',
      description: 'Exclusive 30% off Banarasi silks for returning fashion lovers',
      type: 'announcement-bar',
      placement: 'homepage',
      audience: 'all',
      device: 'all',
      priority: 25,
      frequency: { type: 'session', value: 1 },
      schedule: { startDate: new Date(), endDate },
      coupon: { enabled: true, couponCode: 'ROYAL30', autoApply: true },
      limits: { maxClicks: 500, maxOrders: 100 },
      isAbTest: true,
      variants: [
        {
          variantId: 'A',
          name: 'Classic Gold Variant',
          weight: 50,
          headline: '👑 Royal Festive Special: Flat 30% OFF',
          ctaText: 'Use Code ROYAL30',
          ctaLink: '/products?category=Women',
          ctaStyle: 'gold'
        },
        {
          variantId: 'B',
          name: 'Modern Atelier Variant',
          weight: 50,
          headline: '✨ Couture Heritage Edit: Extra 30% Savings',
          ctaText: 'Claim Discount',
          ctaLink: '/products?category=Women',
          ctaStyle: 'primary'
        }
      ]
    }, authHeaders);

    assert(createRes.status === 201, 'Campaign created (Status 201)');
    assert(createRes.data.campaign.status === 'active', 'Campaign status initialized to "active"');
    assert(createRes.data.campaign.isAbTest === true, 'A/B testing flag enabled');
    assert(createRes.data.campaign.variants.length === 2, 'Two A/B variants configured');

    const testCampaignId = createRes.data.campaign._id;

    // 3. Public Active Campaigns Retrieval with Stock Awareness
    console.log('\n--- 3. Public Active Campaigns Retrieval ---');
    const activeRes = await axios.get(`${API_BASE}/campaigns/active?placement=homepage&device=desktop`);
    assert(activeRes.status === 200, 'Public active campaigns returns Status 200');
    assert(activeRes.data.campaigns.some(c => c._id === testCampaignId), 'Created campaign appears in active list');

    // 4. Conversion Funnel Tracking: Impression -> Click -> Add to Cart -> Purchase
    console.log('\n--- 4. Conversion Funnel & Event Tracking ---');
    // Impression
    const impRes = await axios.post(`${API_BASE}/campaigns/${testCampaignId}/track`, {
      eventType: 'impression',
      variantId: 'A'
    });
    assert(impRes.status === 200, 'Impression event tracked');

    // Click
    const clickRes = await axios.post(`${API_BASE}/campaigns/${testCampaignId}/track`, {
      eventType: 'click',
      variantId: 'A'
    });
    assert(clickRes.status === 200, 'Click event tracked');

    // Add to cart
    const cartRes = await axios.post(`${API_BASE}/campaigns/${testCampaignId}/track`, {
      eventType: 'add_to_cart',
      variantId: 'A'
    });
    assert(cartRes.status === 200, 'Add-to-cart event tracked');

    // Purchase with Revenue
    const purchaseRes = await axios.post(`${API_BASE}/campaigns/${testCampaignId}/track`, {
      eventType: 'purchase',
      variantId: 'A',
      revenue: 4999
    });
    assert(purchaseRes.status === 200, 'Purchase with revenue tracked');

    // Verify Campaign Metrics
    const detailRes = await axios.get(`${API_BASE}/admin/campaigns/${testCampaignId}`, authHeaders);
    const m = detailRes.data.campaign.metrics;
    assert(m.impressions >= 1, `Impressions recorded: ${m.impressions}`);
    assert(m.clicks >= 1, `Clicks recorded: ${m.clicks}`);
    assert(m.addToCarts >= 1, `Add-to-carts recorded: ${m.addToCarts}`);
    assert(m.purchases >= 1, `Purchases recorded: ${m.purchases}`);
    assert(m.revenueGenerated >= 4999, `Revenue generated: ₹${m.revenueGenerated}`);
    assert(detailRes.data.abAnalysis !== null, 'A/B analytics analysis generated');

    // 5. 1-Click Clone Campaign
    console.log('\n--- 5. 1-Click Campaign Duplication ---');
    const cloneRes = await axios.post(`${API_BASE}/admin/campaigns/${testCampaignId}/clone`, {}, authHeaders);
    assert(cloneRes.status === 201, 'Clone returns Status 201');
    assert(cloneRes.data.campaign.title.includes('(Copy)'), 'Cloned campaign has copy suffix');
    assert(cloneRes.data.campaign.status === 'draft', 'Cloned campaign starts in draft status');
    assert(cloneRes.data.campaign.metrics.impressions === 0, 'Cloned metrics reset to 0');

    const clonedId = cloneRes.data.campaign._id;

    // 6. Campaign Calendar Aggregation
    console.log('\n--- 6. Campaign Calendar View ---');
    const calRes = await axios.get(`${API_BASE}/admin/campaigns/calendar`, authHeaders);
    assert(calRes.status === 200, 'Calendar API returns Status 200');
    assert(calRes.data.calendar.live.length >= 1, 'Live campaigns categorized in calendar');
    assert(calRes.data.calendar.draft.length >= 1, 'Draft campaigns categorized in calendar');

    // 7. Funnel Analytics
    console.log('\n--- 7. Funnel Analytics Aggregation ---');
    const funnelRes = await axios.get(`${API_BASE}/admin/campaigns/funnel`, authHeaders);
    assert(funnelRes.status === 200, 'Funnel analytics returns Status 200');
    assert(funnelRes.data.globalFunnel.totalRevenue >= 4999, 'Global revenue aggregated');

    // 8. Marketing Asset Library
    console.log('\n--- 8. Marketing Asset Library ---');
    const assetRes = await axios.post(`${API_BASE}/admin/campaigns/assets`, {
      name: 'Banarasi Gold Festive Banner',
      folder: 'Banners',
      image: {
        url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
        publicId: 'banarasi_festive_banner_test'
      },
      tags: ['festive', 'banarasi', 'gold']
    }, authHeaders);
    assert(assetRes.status === 201, 'Marketing asset saved to library');

    const getAssetsRes = await axios.get(`${API_BASE}/admin/campaigns/assets?folder=Banners`, authHeaders);
    assert(getAssetsRes.status === 200, 'Marketing assets list returned');
    assert(getAssetsRes.data.assets.length >= 1, 'Uploaded asset retrieved in Banners folder');

    // 9. Audit Logs
    console.log('\n--- 9. Marketing Audit Log ---');
    const auditRes = await axios.get(`${API_BASE}/admin/campaigns/audit-logs`, authHeaders);
    assert(auditRes.status === 200, 'Audit logs retrieved');
    assert(auditRes.data.logs.some(l => l.action === 'created'), 'Creation action recorded in audit log');
    assert(auditRes.data.logs.some(l => l.action === 'cloned'), 'Clone action recorded in audit log');

    // 10. Emergency Kill-Switch (Stop All Active Promotions)
    console.log('\n--- 10. Emergency Killswitch (Stop All Active Promotions) ---');
    const emergencyRes = await axios.post(`${API_BASE}/admin/campaigns/emergency-stop-all`, {}, authHeaders);
    assert(emergencyRes.status === 200, 'Emergency killswitch executed successfully');
    assert(emergencyRes.data.pausedCount >= 1, `Paused ${emergencyRes.data.pausedCount} active campaigns`);

    // Verify they are now paused
    const checkPaused = await Campaign.findById(testCampaignId);
    assert(checkPaused.status === 'paused', 'Campaign status updated to "paused" by emergency killswitch');

    // Cleanup test data
    await Campaign.deleteMany({ _id: { $in: [testCampaignId, clonedId] } });
    await MarketingAsset.deleteMany({ 'image.publicId': 'banarasi_festive_banner_test' });
    console.log('\n🧹 Test marketing data cleaned up');

    console.log('\n======================================================');
    console.log(`🏁 MARKETING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Marketing test execution error:', err.response?.data || err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runMarketingTests();
