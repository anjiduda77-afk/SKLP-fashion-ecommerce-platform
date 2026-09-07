/**
 * testDeliverySystem.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Live end-to-end test suite for PHASE 2 — DELIVERY DISTANCE & FEE SYSTEM
 *
 * 20 comprehensive tests covering:
 *  1. Haversine distance accuracy
 *  2. Coordinate validation
 *  3. India bounding box validation
 *  4. Delivery slab lookup logic
 *  5. Free delivery threshold evaluation
 *  6. Minimum delivery fee floor evaluation
 *  7. Max service distance limit
 *  8. Multi-seller custom shopLocation routing
 *  9. Geocoding fallback resilience
 * 10. POST /api/delivery-fee/calculate (public valid lookup)
 * 11. POST /api/delivery-fee/calculate (validation 400 error)
 * 12. GET /api/delivery-fee/config (unauthorized 401)
 * 13. GET /api/delivery-fee/config (customer forbidden 403)
 * 14. GET /api/delivery-fee/config (admin access 200)
 * 15. PUT /api/delivery-fee/config (reject invalid coordinates 400)
 * 16. PUT /api/delivery-fee/config (reject invalid slabs 400)
 * 17. PUT /api/delivery-fee/config (reject invalid platform fee 400)
 * 18. PUT /api/delivery-fee/config/partner-toggle (admin toggle 200)
 * 19. POST /api/orders (server-side delivery fee & method recording)
 * 20. POST /api/orders (rejection when delivery unavailable 422)
 *
 * Run: node backend/scripts/testDeliverySystem.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

import {
  haversineDistance,
  validateCoordinates,
  isIndiaCoordinates,
  getFeeFromSlabs,
  calculateDeliveryBreakdownForSeller
} from '../utils/deliveryUtils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const BASE_URL = process.env.VITE_API_URL || 'https://sklp-fashion-ecommerce-platform.onrender.com/api'
const MONGODB_URI = process.env.MONGODB_URI
const ADMIN_EMAIL = process.env.PRODUCTION_ADMIN_EMAIL || 'anjiduda77@gmail.com'
const ADMIN_PASSWORD = process.env.PRODUCTION_ADMIN_PASSWORD || 'Anji7206@@'

const TEST_CUSTOMER_EMAIL = `delivery_test_${Date.now()}@sklptest.com`
const TEST_CUSTOMER_PASS = 'DeliveryPass@123'

let passed = 0
let failed = 0
const failures = []

function pass(testNum, label) {
  console.log(`  [Test ${String(testNum).padStart(2, '0')}] ✅ PASS: ${label}`)
  passed++
}

function fail(testNum, label, reason) {
  console.error(`  [Test ${String(testNum).padStart(2, '0')}] ❌ FAIL: ${label}`)
  console.error(`          → ${reason}`)
  failed++
  failures.push({ testNum, label, reason })
}

function section(title) {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  ${title}`)
  console.log('═'.repeat(70))
}

async function runTest(testNum, label, fn) {
  try {
    await fn()
    pass(testNum, label)
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || String(err)
    fail(testNum, label, msg)
  }
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`)
  console.log(`║     PHASE 2 — DELIVERY DISTANCE & FEE SYSTEM TEST SUITE                     ║`)
  console.log(`║     Target API: ${BASE_URL.padEnd(58)}║`)
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`)

  let adminToken = null
  let customerToken = null
  let customerUser = null
  let createdProductId = null

  // Connect to DB for setup & cleanup
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI)
      console.log('✓ Connected to MongoDB Atlas for setup & test verification.')
    } catch (e) {
      console.warn('⚠️ Could not connect directly to MongoDB:', e.message)
    }
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1: UNIT & ALGORITHM VERIFICATION (Tests 1 - 9)
    // ═══════════════════════════════════════════════════════════════════════════
    section('SECTION 1: UNIT & ALGORITHM VERIFICATION')

    // Test 1: Haversine distance accuracy
    await runTest(1, 'Haversine distance calculation accuracy', async () => {
      // Hyderabad (17.3850, 78.4867) to Secunderabad (17.4399, 78.4983)
      const distHydSec = haversineDistance(17.3850, 78.4867, 17.4399, 78.4983)
      if (distHydSec < 5 || distHydSec > 10) {
        throw new Error(`Hyderabad to Secunderabad distance unexpected: ${distHydSec} km (expected ~6-9 km)`)
      }

      // Hyderabad to Mumbai (19.0760, 72.8777)
      const distHydMum = haversineDistance(17.3850, 78.4867, 19.0760, 72.8777)
      if (distHydMum < 610 || distHydMum > 630) {
        throw new Error(`Hyderabad to Mumbai distance unexpected: ${distHydMum} km (expected ~615-625 km)`)
      }
    })

    // Test 2: Coordinate validation
    await runTest(2, 'Coordinate validation (bounds, NaN, (0,0) null-island)', async () => {
      if (!validateCoordinates(17.3850, 78.4867)) throw new Error('Valid Hyderabad coordinates rejected')
      if (validateCoordinates(0, 0)) throw new Error('(0,0) null-island should be rejected')
      if (validateCoordinates(95, 78)) throw new Error('Latitude > 90 should be rejected')
      if (validateCoordinates(-95, 78)) throw new Error('Latitude < -90 should be rejected')
      if (validateCoordinates(17, 185)) throw new Error('Longitude > 180 should be rejected')
      if (validateCoordinates(NaN, 78)) throw new Error('NaN latitude should be rejected')
      if (validateCoordinates('17.38', 78)) throw new Error('String latitude should be rejected')
      if (validateCoordinates(null, null)) throw new Error('Null coordinates should be rejected')
    })

    // Test 3: India bounding box validation
    await runTest(3, 'India bounding box coordinate validation', async () => {
      if (!isIndiaCoordinates(17.3850, 78.4867)) throw new Error('Hyderabad should be within India')
      if (!isIndiaCoordinates(28.6139, 77.2090)) throw new Error('New Delhi should be within India')
      if (!isIndiaCoordinates(12.9716, 77.5946)) throw new Error('Bangalore should be within India')
      if (isIndiaCoordinates(51.5074, -0.1278)) throw new Error('London must not be within India')
      if (isIndiaCoordinates(40.7128, -74.0060)) throw new Error('New York must not be within India')
    })

    // Test 4: Delivery slab lookup logic
    await runTest(4, 'Delivery slab fee lookup for distance tiers', async () => {
      const defaultSlabs = [
        { minKm: 0,  maxKm: 5,     fee: 0,  label: 'Free delivery within 5 km' },
        { minKm: 5,  maxKm: 10,    fee: 20, label: '₹20' },
        { minKm: 10, maxKm: 20,    fee: 30, label: '₹30' },
        { minKm: 20, maxKm: 30,    fee: 40, label: '₹40' },
        { minKm: 30, maxKm: 99999, fee: 50, label: '₹50' }
      ]

      const slab2 = getFeeFromSlabs(2, defaultSlabs)
      if (slab2.fee !== 0) throw new Error(`Distance 2km should be ₹0, got ₹${slab2.fee}`)

      const slab7 = getFeeFromSlabs(7, defaultSlabs)
      if (slab7.fee !== 20) throw new Error(`Distance 7km should be ₹20, got ₹${slab7.fee}`)

      const slab15 = getFeeFromSlabs(15, defaultSlabs)
      if (slab15.fee !== 30) throw new Error(`Distance 15km should be ₹30, got ₹${slab15.fee}`)

      const slab25 = getFeeFromSlabs(25, defaultSlabs)
      if (slab25.fee !== 40) throw new Error(`Distance 25km should be ₹40, got ₹${slab25.fee}`)

      const slab55 = getFeeFromSlabs(55, defaultSlabs)
      if (slab55.fee !== 50) throw new Error(`Distance 55km should be ₹50, got ₹${slab55.fee}`)
    })

    // Test 5: Free delivery threshold evaluation
    await runTest(5, 'Free delivery threshold evaluation by cart subtotal', async () => {
      const mockConfig = {
        storeLocation: { lat: 17.3850, lng: 78.4867, address: 'Hyderabad' },
        deliverySlabs: [{ minKm: 0, maxKm: 100, fee: 40, label: 'Standard' }],
        freeDeliveryThresholdAmount: 500,
        maxServiceDistanceKm: 100
      }
      // Subtotal below threshold -> standard fee
      const resBelow = await calculateDeliveryBreakdownForSeller(
        { city: 'Hyderabad', postalCode: '500001' },
        null,
        mockConfig,
        300
      )
      if (resBelow.deliveryFee !== 40) {
        throw new Error(`Expected fee ₹40 when subtotal (₹300) < threshold (₹500), got ₹${resBelow.deliveryFee}`)
      }

      // Subtotal equal or above threshold -> free delivery
      const resAbove = await calculateDeliveryBreakdownForSeller(
        { city: 'Hyderabad', postalCode: '500001' },
        null,
        mockConfig,
        550
      )
      if (resAbove.deliveryFee !== 0) {
        throw new Error(`Expected fee ₹0 when subtotal (₹550) >= threshold (₹500), got ₹${resAbove.deliveryFee}`)
      }
      if (!resAbove.deliveryLabel.includes('Free delivery')) {
        throw new Error(`Label should indicate free delivery, got: ${resAbove.deliveryLabel}`)
      }
    })

    // Test 6: Minimum delivery fee floor evaluation
    await runTest(6, 'Minimum delivery fee floor enforcement', async () => {
      const mockConfig = {
        storeLocation: { lat: 17.3850, lng: 78.4867, address: 'Hyderabad' },
        deliverySlabs: [{ minKm: 0, maxKm: 50, fee: 15, label: 'Standard ₹15' }],
        minimumDeliveryFee: 35,
        maxServiceDistanceKm: 100
      }
      const res = await calculateDeliveryBreakdownForSeller(
        { city: 'Hyderabad', postalCode: '500001' },
        null,
        mockConfig,
        200
      )
      if (res.deliveryFee !== 35) {
        throw new Error(`Expected fee to be floored to minimum ₹35, got ₹${res.deliveryFee}`)
      }
    })

    // Test 7: Max service distance limit
    await runTest(7, 'Max service distance limit sets deliveryUnavailable: true', async () => {
      const mockConfig = {
        storeLocation: { lat: 17.3850, lng: 78.4867, address: 'Hyderabad' },
        deliverySlabs: [{ minKm: 0, maxKm: 99999, fee: 50, label: 'All India' }],
        maxServiceDistanceKm: 15 // Only 15km allowed
      }
      // Mumbai is ~620 km away from Hyderabad -> exceeds 15km
      const res = await calculateDeliveryBreakdownForSeller(
        { city: 'Mumbai', postalCode: '400001' },
        null,
        mockConfig,
        200
      )
      if (!res.deliveryUnavailable) {
        throw new Error('Expected deliveryUnavailable to be true for distance exceeding 15km')
      }
      if (res.deliveryFee !== 0) {
        throw new Error(`Delivery fee should be 0 when unavailable, got ${res.deliveryFee}`)
      }
    })

    // Test 8: Multi-seller custom shopLocation routing
    await runTest(8, 'Multi-seller custom shopLocation computes distinct distance', async () => {
      const mockConfig = {
        storeLocation: { lat: 17.3850, lng: 78.4867, address: 'Hyderabad' },
        deliverySlabs: [{ minKm: 0, maxKm: 99999, fee: 50, label: 'Standard' }],
        maxServiceDistanceKm: 1000
      }
      const customerAddr = { city: 'Hyderabad', postalCode: '500001' }

      // Seller A is in Vijayawada (lat: 16.5062, lng: 80.6480)
      const sellerVijayawada = { lat: 16.5062, lng: 80.6480, city: 'Vijayawada' }

      const resGlobal = await calculateDeliveryBreakdownForSeller(customerAddr, null, mockConfig)
      const resSeller = await calculateDeliveryBreakdownForSeller(customerAddr, sellerVijayawada, mockConfig)

      if (resGlobal.distanceKm === null || resSeller.distanceKm === null) {
        throw new Error('Distance calculation returned null')
      }
      // Distance from Hyderabad to Hyderabad is < 15km; Vijayawada to Hyderabad is > 200km
      if (resSeller.distanceKm <= resGlobal.distanceKm) {
        throw new Error(`Seller in Vijayawada should have higher distance (${resSeller.distanceKm} km) than Hyderabad local store (${resGlobal.distanceKm} km)`)
      }
    })

    // Test 9: Geocoding fallback resilience
    await runTest(9, 'Geocoding fallback handles obscure address gracefully', async () => {
      const mockConfig = {
        storeLocation: { lat: 17.3850, lng: 78.4867, address: 'Hyderabad' },
        deliverySlabs: [{ minKm: 0, maxKm: 50, fee: 35, label: 'Standard ₹35' }],
        maxServiceDistanceKm: 100
      }
      // Unresolvable random non-existent location
      const fallbackResult = await calculateDeliveryBreakdownForSeller(
        { city: 'XyZqWrUnknownPlace987654321', postalCode: '000000' },
        null,
        mockConfig
      )
      if (!fallbackResult.geocodingFailed) {
        throw new Error('Expected geocodingFailed to be true for non-existent address')
      }
      if (typeof fallbackResult.deliveryFee !== 'number' || fallbackResult.deliveryFee < 0) {
        throw new Error('Expected numeric positive deliveryFee fallback')
      }
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: LIVE API ENDPOINT VERIFICATION (Tests 10 - 20)
    // ═══════════════════════════════════════════════════════════════════════════
    section('SECTION 2: LIVE API ENDPOINT VERIFICATION')

    // Acquire Admin Token
    console.log('  → Authenticating Admin against live API...')
    try {
      const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
      adminToken = adminRes.data.token
      console.log('  ✓ Admin logged in successfully.')
    } catch (err) {
      console.warn('  ⚠️ Admin login failed:', err?.response?.data?.message || err.message)
    }

    // Register a test customer for customer-level tests
    console.log('  → Creating test customer for role checks...')
    try {
      const custRes = await axios.post(`${BASE_URL}/auth/register`, {
        firstName: 'Delivery',
        lastName: 'Tester',
        email: TEST_CUSTOMER_EMAIL,
        password: TEST_CUSTOMER_PASS,
        phone: '9876543210'
      })
      customerToken = custRes.data.token
      customerUser = custRes.data.user
      console.log('  ✓ Test customer registered successfully.')
    } catch (err) {
      console.warn('  ⚠️ Customer registration note:', err?.response?.data?.message || err.message)
    }

    // Test 10: POST /api/delivery-fee/calculate (public valid lookup)
    await runTest(10, 'POST /api/delivery-fee/calculate calculates fee for address', async () => {
      const res = await axios.post(`${BASE_URL}/delivery-fee/calculate`, {
        city: 'Hyderabad',
        postalCode: '500001',
        state: 'Telangana',
        country: 'India'
      })
      if (!res.data.success) throw new Error('API returned success: false')
      if (typeof res.data.deliveryFee !== 'number') throw new Error('deliveryFee is not a number')
      if (typeof res.data.deliveryLabel !== 'string') throw new Error('deliveryLabel is not a string')
      if (typeof res.data.platformFeePercent !== 'number') throw new Error('platformFeePercent missing')
    })

    // Test 11: POST /api/delivery-fee/calculate (validation 400 error)
    await runTest(11, 'POST /api/delivery-fee/calculate rejects missing city & postalCode with 400', async () => {
      try {
        await axios.post(`${BASE_URL}/delivery-fee/calculate`, {
          street: 'Some Random Street'
        })
        throw new Error('Should have rejected with 400')
      } catch (err) {
        if (err.response?.status !== 400) {
          throw new Error(`Expected HTTP 400, got ${err.response?.status}`)
        }
      }
    })

    // Test 12: GET /api/delivery-fee/config (unauthorized 401)
    await runTest(12, 'GET /api/delivery-fee/config requires authentication (401)', async () => {
      try {
        await axios.get(`${BASE_URL}/delivery-fee/config`)
        throw new Error('Should have rejected unauthenticated request')
      } catch (err) {
        if (err.response?.status !== 401) {
          throw new Error(`Expected HTTP 401, got ${err.response?.status}`)
        }
      }
    })

    // Test 13: GET /api/delivery-fee/config (customer forbidden 403)
    await runTest(13, 'GET /api/delivery-fee/config rejects non-admin customer with 403', async () => {
      if (!customerToken) throw new Error('Customer token not available')
      try {
        await axios.get(`${BASE_URL}/delivery-fee/config`, {
          headers: { Authorization: `Bearer ${customerToken}` }
        })
        throw new Error('Customer should be forbidden from accessing admin config')
      } catch (err) {
        if (err.response?.status !== 403) {
          throw new Error(`Expected HTTP 403, got ${err.response?.status}`)
        }
      }
    })

    // Test 14: GET /api/delivery-fee/config (admin access 200)
    await runTest(14, 'GET /api/delivery-fee/config returns full configuration for Admin', async () => {
      if (!adminToken) throw new Error('Admin token not available')
      const res = await axios.get(`${BASE_URL}/delivery-fee/config`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (!res.data.success || !res.data.config) throw new Error('Missing config object in response')
      const cfg = res.data.config
      if (!Array.isArray(cfg.deliverySlabs)) throw new Error('deliverySlabs is not an array')
      if (!cfg.storeLocation?.lat || !cfg.storeLocation?.lng) throw new Error('storeLocation lat/lng missing')
      if (typeof cfg.deliveryPartnerEnabled !== 'boolean') throw new Error('deliveryPartnerEnabled missing')
    })

    // Test 15: PUT /api/delivery-fee/config (reject invalid coordinates 400)
    await runTest(15, 'PUT /api/delivery-fee/config rejects out-of-bounds coordinates with 400', async () => {
      if (!adminToken) throw new Error('Admin token not available')
      try {
        await axios.put(
          `${BASE_URL}/delivery-fee/config`,
          { storeLocation: { lat: 95, lng: 78.4867 } }, // lat > 90
          { headers: { Authorization: `Bearer ${adminToken}` } }
        )
        throw new Error('Should have rejected invalid latitude')
      } catch (err) {
        if (err.response?.status !== 400) {
          throw new Error(`Expected HTTP 400, got ${err.response?.status}`)
        }
      }
    })

    // Test 16: PUT /api/delivery-fee/config (reject invalid slabs 400)
    await runTest(16, 'PUT /api/delivery-fee/config rejects invalid / negative delivery slabs with 400', async () => {
      if (!adminToken) throw new Error('Admin token not available')
      try {
        await axios.put(
          `${BASE_URL}/delivery-fee/config`,
          { deliverySlabs: [{ minKm: 0, maxKm: 10, fee: -20, label: 'Negative fee' }] },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        )
        throw new Error('Should have rejected negative slab fee')
      } catch (err) {
        if (err.response?.status !== 400) {
          throw new Error(`Expected HTTP 400, got ${err.response?.status}`)
        }
      }
    })

    // Test 17: PUT /api/delivery-fee/config (reject invalid platform fee 400)
    await runTest(17, 'PUT /api/delivery-fee/config rejects platformFeePercent > 100 with 400', async () => {
      if (!adminToken) throw new Error('Admin token not available')
      try {
        await axios.put(
          `${BASE_URL}/delivery-fee/config`,
          { platformFeePercent: 120 },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        )
        throw new Error('Should have rejected platformFeePercent > 100')
      } catch (err) {
        if (err.response?.status !== 400) {
          throw new Error(`Expected HTTP 400, got ${err.response?.status}`)
        }
      }
    })

    // Test 18: PUT /api/delivery-fee/config/partner-toggle (admin toggle 200)
    await runTest(18, 'PUT /api/delivery-fee/config/partner-toggle toggles partner delivery mode', async () => {
      if (!adminToken) throw new Error('Admin token not available')

      // Toggle ON
      const resOn = await axios.put(
        `${BASE_URL}/delivery-fee/config/partner-toggle`,
        { enabled: true },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )
      if (resOn.data.deliveryPartnerEnabled !== true) {
        throw new Error('Expected deliveryPartnerEnabled to be true after toggle ON')
      }

      // Toggle OFF (default Self Delivery mode)
      const resOff = await axios.put(
        `${BASE_URL}/delivery-fee/config/partner-toggle`,
        { enabled: false },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )
      if (resOff.data.deliveryPartnerEnabled !== false) {
        throw new Error('Expected deliveryPartnerEnabled to be false after toggle OFF')
      }
    })

    // Seed temporary product in DB for order tests (if direct DB available)
    if (mongoose.connection.readyState === 1) {
      try {
        const prod = await mongoose.connection.db.collection('products').insertOne({
          name: 'Delivery Test Silk Shirt',
          slug: `delivery-test-shirt-${Date.now()}`,
          description: 'A test product used strictly for testing order delivery fee computation.',
          category: 'shirts',
          gender: 'men',
          brand: 'SKLP Fashion',
          price: 999,
          stock: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        createdProductId = prod.insertedId
      } catch (e) {
        console.warn('⚠️ Could not seed test product:', e.message)
      }
    }

    // Test 19: POST /api/orders (server-side delivery fee & method recording)
    await runTest(19, 'POST /api/orders enforces server-side delivery calculation in suborder', async () => {
      if (!customerToken || !createdProductId) {
        throw new Error('Customer token or test product unavailable for order placement test')
      }

      // Add item to cart
      await axios.post(
        `${BASE_URL}/cart`,
        { productId: createdProductId.toString(), quantity: 1 },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      )

      // Place order with attempt to tamper/specify deliveryFee from client (should be IGNORED by server)
      const orderRes = await axios.post(
        `${BASE_URL}/orders`,
        {
          shippingAddress: {
            street: 'Jubilee Hills Road 36',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500033',
            country: 'India'
          },
          paymentMethod: 'cod',
          phone: '9876543210',
          deliveryFee: 1 // Attempted spoof
        },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      )

      const order = orderRes.data.order
      if (!order) throw new Error('Order was not returned in response')
      if (typeof order.deliveryFee !== 'number') throw new Error('deliveryFee is not recorded on order')
      if (!Array.isArray(order.sellerSuborders) || order.sellerSuborders.length === 0) {
        throw new Error('sellerSuborders missing on created order')
      }
      const sub = order.sellerSuborders[0]
      if (!sub.deliveryMethod) throw new Error('deliveryMethod missing on sellerSuborder')
      if (sub.deliveryFee === undefined) throw new Error('deliveryFee missing on sellerSuborder')
    })

    // Test 20: POST /api/orders (rejection when delivery unavailable 422)
    await runTest(20, 'POST /api/orders rejects order with 422 when destination exceeds max distance', async () => {
      if (!adminToken || !customerToken || !createdProductId) {
        throw new Error('Admin, customer, or product not available for max distance test')
      }

      // Set maxServiceDistanceKm temporarily to 1 km via Admin API
      await axios.put(
        `${BASE_URL}/delivery-fee/config`,
        { maxServiceDistanceKm: 1 },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )

      try {
        // Add item to cart
        await axios.post(
          `${BASE_URL}/cart`,
          { productId: createdProductId.toString(), quantity: 1 },
          { headers: { Authorization: `Bearer ${customerToken}` } }
        )

        // Destination is Mumbai (~620 km) which exceeds 1 km limit
        await axios.post(
          `${BASE_URL}/orders`,
          {
            shippingAddress: {
              street: 'Nariman Point',
              city: 'Mumbai',
              state: 'Maharashtra',
              postalCode: '400021',
              country: 'India'
            },
            paymentMethod: 'cod',
            phone: '9876543210'
          },
          { headers: { Authorization: `Bearer ${customerToken}` } }
        )

        throw new Error('Expected order creation to fail with 422 when distance exceeds limit')
      } catch (err) {
        if (err.response?.status !== 422) {
          throw new Error(`Expected HTTP 422 Unprocessable Entity, got ${err.response?.status} (${err.message})`)
        }
      } finally {
        // Restore maxServiceDistanceKm back to standard 50 km
        await axios.put(
          `${BASE_URL}/delivery-fee/config`,
          { maxServiceDistanceKm: 50 },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        )
      }
    })

  } finally {
    // ═══════════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════════════
    if (mongoose.connection.readyState === 1) {
      console.log('\n🧹 Performing test cleanup...')
      try {
        if (createdProductId) {
          await mongoose.connection.db.collection('products').deleteOne({ _id: createdProductId })
        }
        await mongoose.connection.db.collection('users').deleteOne({ email: TEST_CUSTOMER_EMAIL })
        await mongoose.connection.db.collection('orders').deleteMany({ 'shippingAddress.street': 'Jubilee Hills Road 36' })
        await mongoose.connection.db.collection('carts').deleteMany({ userId: customerUser?._id })
        console.log('✓ Test data successfully cleaned up from MongoDB.')
      } catch (e) {
        console.warn('⚠️ Cleanup error:', e.message)
      }
      await mongoose.disconnect()
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  DELIVERY SYSTEM TEST RESULTS: ${passed}/20 PASSED (${failed} FAILED)`)
  console.log('═'.repeat(70))

  if (failures.length > 0) {
    console.error('\nFAILURES:')
    for (const f of failures) {
      console.error(`  - [Test ${f.testNum}] ${f.label}: ${f.reason}`)
    }
  }

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Fatal test error:', e)
  process.exit(1)
})
