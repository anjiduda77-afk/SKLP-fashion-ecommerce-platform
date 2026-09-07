/**
 * testProfileAndAddressManagement.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Live end-to-end test suite for PHASE 1 — USER PROFILE & ADDRESS MANAGEMENT
 *
 * Tests against: https://sklp-fashion-ecommerce-platform.onrender.com/api
 * MongoDB Atlas: connected via Render env
 *
 * Run:  node backend/scripts/testProfileAndAddressManagement.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.VITE_API_URL || 'https://sklp-fashion-ecommerce-platform.onrender.com/api'
const MONGODB_URI = process.env.MONGODB_URI

const CUSTOMER_A_EMAIL = `test_addr_a_${Date.now()}@sklptest.com`
const CUSTOMER_A_PASS  = 'TestPass@123'
const CUSTOMER_B_EMAIL = `test_addr_b_${Date.now()}@sklptest.com`
const CUSTOMER_B_PASS  = 'TestPass@456'

let passed = 0
let failed = 0
const failures = []

// ── Helpers ───────────────────────────────────────────────────────────────────
function pass(label) {
  console.log(`  ✅  PASS: ${label}`)
  passed++
}

function fail(label, reason) {
  console.error(`  ❌  FAIL: ${label}`)
  console.error(`         → ${reason}`)
  failed++
  failures.push({ label, reason })
}

function section(title) {
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(70))
}

async function expect(label, fn) {
  try {
    await fn()
    pass(label)
  } catch (err) {
    fail(label, err.message || String(err))
  }
}

async function register(email, password) {
  const res = await axios.post(`${BASE_URL}/auth/register`, {
    email,
    password,
    firstName: 'Test',
    lastName: 'User'
  })
  if (!res.data?.token) throw new Error('No token in register response')
  return res.data.token
}

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('  PHASE 1 — USER PROFILE & ADDRESS MANAGEMENT — LIVE TEST SUITE')
  console.log(`  Target: ${BASE_URL}`)
  console.log('══════════════════════════════════════════════════════════════════════')

  // ── Register two test customers ────────────────────────────────────────────
  let tokenA, tokenB
  try {
    tokenA = await register(CUSTOMER_A_EMAIL, CUSTOMER_A_PASS)
    tokenB = await register(CUSTOMER_B_EMAIL, CUSTOMER_B_PASS)
    console.log(`\n  Registered Customer A: ${CUSTOMER_A_EMAIL}`)
    console.log(`  Registered Customer B: ${CUSTOMER_B_EMAIL}`)
  } catch (err) {
    console.error('❌ Setup failed — could not register test users:', err.message)
    process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('1. UNAUTHENTICATED ACCESS → 401')
  // ═══════════════════════════════════════════════════════════════════════════

  await expect('GET /users/addresses without token → 401', async () => {
    try {
      await axios.get(`${BASE_URL}/users/addresses`)
      throw new Error('Expected 401 but got 200')
    } catch (err) {
      if (err.response?.status !== 401) throw new Error(`Expected 401, got ${err.response?.status}`)
    }
  })

  await expect('POST /users/addresses without token → 401', async () => {
    try {
      await axios.post(`${BASE_URL}/users/addresses`, { street: 'x', city: 'y', state: 'z', postalCode: '500001' })
      throw new Error('Expected 401 but got 200')
    } catch (err) {
      if (err.response?.status !== 401) throw new Error(`Expected 401, got ${err.response?.status}`)
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section('2. ADD ADDRESS — VALID DATA → 201')
  // ═══════════════════════════════════════════════════════════════════════════

  const validAddress = {
    street: '42 MG Road, Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500034',
    country: 'India',
    label: 'Home',
    phone: '9876543210'
  }

  let address1Id, address2Id

  await expect('POST /users/addresses with valid data → 201', async () => {
    const res = await axios.post(`${BASE_URL}/users/addresses`, validAddress, authHeaders(tokenA))
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`)
    if (!res.data?.address?._id) throw new Error('No address._id in response')
    address1Id = res.data.address._id
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section('3. ADD ADDRESS — VALIDATION FAILURES → 400')
  // ═══════════════════════════════════════════════════════════════════════════

  const badCases = [
    { desc: 'missing street → 400',                body: { city: 'Hyderabad', state: 'Telangana', postalCode: '500034' } },
    { desc: 'missing city → 400',                   body: { street: '42 MG Rd', state: 'Telangana', postalCode: '500034' } },
    { desc: 'missing state → 400',                  body: { street: '42 MG Rd', city: 'Hyderabad', postalCode: '500034' } },
    { desc: 'missing postalCode → 400',             body: { street: '42 MG Rd', city: 'Hyderabad', state: 'Telangana' } },
    { desc: 'PIN "000000" (starts with 0) → 400',   body: { street: '42 MG Rd', city: 'Hyderabad', state: 'TG', postalCode: '000000' } },
    { desc: 'PIN "123" (too short) → 400',          body: { street: '42 MG Rd', city: 'Hyderabad', state: 'TG', postalCode: '123' } },
    { desc: 'PIN "ABCDEF" (letters) → 400',         body: { street: '42 MG Rd', city: 'Hyderabad', state: 'TG', postalCode: 'ABCDEF' } },
    { desc: 'PIN "1234567" (7 digits) → 400',       body: { street: '42 MG Rd', city: 'Hyderabad', state: 'TG', postalCode: '1234567' } },
    { desc: 'invalid phone (too short) → 400',      body: { street: '42 MG Rd', city: 'Hyderabad', state: 'TG', postalCode: '500034', phone: '12345' } },
  ]

  for (const { desc, body } of badCases) {
    await expect(desc, async () => {
      try {
        await axios.post(`${BASE_URL}/users/addresses`, body, authHeaders(tokenA))
        throw new Error('Expected 400 but got 200')
      } catch (err) {
        if (err.response?.status !== 400) throw new Error(`Expected 400, got ${err.response?.status || err.message}`)
      }
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('4. DUPLICATE ADDRESS → 409')
  // ═══════════════════════════════════════════════════════════════════════════

  await expect('Exact duplicate address → 409', async () => {
    try {
      await axios.post(`${BASE_URL}/users/addresses`, validAddress, authHeaders(tokenA))
      throw new Error('Expected 409 but got 200')
    } catch (err) {
      if (err.response?.status !== 409) throw new Error(`Expected 409, got ${err.response?.status}`)
    }
  })

  await expect('Case-insensitive duplicate → 409', async () => {
    try {
      const cased = { ...validAddress, street: validAddress.street.toUpperCase(), city: validAddress.city.toLowerCase() }
      await axios.post(`${BASE_URL}/users/addresses`, cased, authHeaders(tokenA))
      throw new Error('Expected 409 but got 200')
    } catch (err) {
      if (err.response?.status !== 409) throw new Error(`Expected 409, got ${err.response?.status}`)
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section('5. ADD SECOND ADDRESS & GET ADDRESSES')
  // ═══════════════════════════════════════════════════════════════════════════

  const address2 = {
    street: '10 Film Nagar',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500096',
    country: 'India',
    label: 'Office',
    phone: '9000011111'
  }

  await expect('Add second address → 201', async () => {
    const res = await axios.post(`${BASE_URL}/users/addresses`, address2, authHeaders(tokenA))
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`)
    address2Id = res.data.address._id
  })

  await expect('GET /users/addresses returns both addresses', async () => {
    const res = await axios.get(`${BASE_URL}/users/addresses`, authHeaders(tokenA))
    const addrs = res.data?.addresses
    if (!Array.isArray(addrs) || addrs.length < 2) throw new Error(`Expected ≥2 addresses, got ${addrs?.length}`)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section('6. SET DEFAULT ADDRESS')
  // ═══════════════════════════════════════════════════════════════════════════

  await expect('PUT /addresses/:id/default → 200, only that address isDefault=true', async () => {
    const res = await axios.put(`${BASE_URL}/users/addresses/${address2Id}/default`, {}, authHeaders(tokenA))
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const listRes = await axios.get(`${BASE_URL}/users/addresses`, authHeaders(tokenA))
    const addr2 = listRes.data.addresses.find(a => a._id === address2Id)
    if (!addr2?.isDefault) throw new Error('address2 should now be default')
    const addr1 = listRes.data.addresses.find(a => a._id === address1Id)
    if (addr1?.isDefault) throw new Error('address1 should no longer be default')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section('7. UPDATE ADDRESS')
  // ═══════════════════════════════════════════════════════════════════════════

  await expect('PUT /addresses/:id → 200, city updated', async () => {
    const res = await axios.put(
      `${BASE_URL}/users/addresses/${address1Id}`,
      { street: '99 Updated Street', city: 'Chennai', state: 'Tamil Nadu', postalCode: '600001' },
      authHeaders(tokenA)
    )
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const updated = res.data?.address
    if (updated?.city !== 'Chennai') throw new Error(`Expected city=Chennai, got ${updated?.city}`)
  })

  await expect('Update address with invalid PIN → 400', async () => {
    try {
      await axios.put(`${BASE_URL}/users/addresses/${address1Id}`, { postalCode: '000000' }, authHeaders(tokenA))
      throw new Error('Expected 400 but got 200')
    } catch (err) {
      if (err.response?.status !== 400) throw new Error(`Expected 400, got ${err.response?.status}`)
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section("8. CUSTOMER ISOLATION — B cannot touch A's addresses")
  // ═══════════════════════════════════════════════════════════════════════════

  await expect("Customer B PUT address of A → 403/404", async () => {
    try {
      await axios.put(`${BASE_URL}/users/addresses/${address1Id}`, { street: 'Hack St' }, authHeaders(tokenB))
      throw new Error('Expected 403/404 but got 200')
    } catch (err) {
      if (![403, 404].includes(err.response?.status))
        throw new Error(`Expected 403/404, got ${err.response?.status}`)
    }
  })

  await expect("Customer B DELETE address of A → 403/404", async () => {
    try {
      await axios.delete(`${BASE_URL}/users/addresses/${address1Id}`, authHeaders(tokenB))
      throw new Error('Expected 403/404 but got 200')
    } catch (err) {
      if (![403, 404].includes(err.response?.status))
        throw new Error(`Expected 403/404, got ${err.response?.status}`)
    }
  })

  await expect("Customer B SET DEFAULT address of A → 403/404", async () => {
    try {
      await axios.put(`${BASE_URL}/users/addresses/${address1Id}/default`, {}, authHeaders(tokenB))
      throw new Error('Expected 403/404 but got 200')
    } catch (err) {
      if (![403, 404].includes(err.response?.status))
        throw new Error(`Expected 403/404, got ${err.response?.status}`)
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section('9. DELETE ADDRESS & DEFAULT REASSIGNMENT')
  // ═══════════════════════════════════════════════════════════════════════════

  await expect('DELETE default address → 200, deleted address removed from list', async () => {
    const res = await axios.delete(`${BASE_URL}/users/addresses/${address2Id}`, authHeaders(tokenA))
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const listRes = await axios.get(`${BASE_URL}/users/addresses`, authHeaders(tokenA))
    if (listRes.data.addresses.some(a => a._id === address2Id))
      throw new Error('Deleted address still present in list')
  })

  await expect('DELETE last address → 200, empty list', async () => {
    const res = await axios.delete(`${BASE_URL}/users/addresses/${address1Id}`, authHeaders(tokenA))
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const listRes = await axios.get(`${BASE_URL}/users/addresses`, authHeaders(tokenA))
    if ((listRes.data.addresses?.length ?? 0) !== 0)
      throw new Error(`Expected 0 addresses, got ${listRes.data.addresses?.length}`)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section('10. SENSITIVE FIELDS NOT EXPOSED IN RESPONSE')
  // ═══════════════════════════════════════════════════════════════════════════

  await expect('GET /auth/me omits password, refreshTokens, twoFactorSecret', async () => {
    const res = await axios.get(`${BASE_URL}/auth/me`, authHeaders(tokenA))
    const u = res.data?.user || res.data
    const sensitivePresent = ['password', 'refreshTokens', 'twoFactorSecret'].filter(f => u[f] !== undefined)
    if (sensitivePresent.length > 0)
      throw new Error(`Sensitive fields exposed: ${sensitivePresent.join(', ')}`)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  section('11. PROFILE UPDATE')
  // ═══════════════════════════════════════════════════════════════════════════

  await expect('PUT /users/profile → 200, firstName updated', async () => {
    const res = await axios.put(
      `${BASE_URL}/users/profile`,
      { firstName: 'Updated', lastName: 'Name', phone: '9123456789' },
      authHeaders(tokenA)
    )
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const u = res.data?.user
    if (u?.firstName !== 'Updated') throw new Error(`Expected firstName=Updated, got ${u?.firstName}`)
  })

  await expect('PUT /users/profile with invalid phone → 400', async () => {
    try {
      await axios.put(`${BASE_URL}/users/profile`, { phone: '123' }, authHeaders(tokenA))
      throw new Error('Expected 400 but got 200')
    } catch (err) {
      if (err.response?.status !== 400) throw new Error(`Expected 400, got ${err.response?.status}`)
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════
  if (MONGODB_URI) {
    section('CLEANUP — Removing test users from DB')
    try {
      await mongoose.connect(MONGODB_URI)
      const User = (await import('../models/User.js')).default
      const delA = await User.deleteOne({ email: CUSTOMER_A_EMAIL })
      const delB = await User.deleteOne({ email: CUSTOMER_B_EMAIL })
      console.log(`  Deleted A: ${delA.deletedCount === 1 ? 'OK' : 'NOT FOUND'}`)
      console.log(`  Deleted B: ${delB.deletedCount === 1 ? 'OK' : 'NOT FOUND'}`)
      await mongoose.connection.close()
    } catch (cleanErr) {
      console.warn('  ⚠️  Cleanup warning:', cleanErr.message)
    }
  } else {
    console.warn('\n  ⚠️  MONGODB_URI not set; test users NOT cleaned up.')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log(`  Total: ${passed + failed}  |  ✅ PASS: ${passed}  |  ❌ FAIL: ${failed}`)
  if (failures.length > 0) {
    console.log('\n  Failed tests:')
    failures.forEach(f => console.log(`    • ${f.label}\n      ${f.reason}`))
  }
  console.log(`\n  STATUS: ${failed === 0 ? '✅ PASS' : '❌ FAIL'}`)
  console.log('══════════════════════════════════════════════════════════════════════\n')
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message)
  process.exit(1)
})
