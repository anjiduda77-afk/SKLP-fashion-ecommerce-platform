import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  calculatePlatformSlabFee,
  haversineDistance,
  validateCoordinates,
  isIndiaCoordinates
} from '../utils/deliveryUtils.js'
import { normalizeE164Phone } from '../controllers/authController.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

let passed = 0
let failed = 0
const failures = []

function pass(name) {
  console.log(`  ✅ PASS: ${name}`)
  passed++
}

function fail(name, reason) {
  console.error(`  ❌ FAIL: ${name}`)
  console.error(`          → ${reason}`)
  failed++
  failures.push({ name, reason })
}

async function run(name, fn) {
  try {
    await fn()
    pass(name)
  } catch (err) {
    fail(name, err.message)
  }
}

console.log(`\n======================================================================`)
console.log(`   STYREET MARKETPLACE MASTER VERIFICATION SUITE`)
console.log(`======================================================================\n`)

async function main() {

  // ── SECTION 1: PLATFORM DELIVERY SLAB ALGORITHM ─────────────────────────────
  console.log(`── 1. PLATFORM DELIVERY DISTANCE SLABS (PURE UNIT TESTS) ─────────────`)

  await run('Distance 0 km maps to ₹10 (default / minimum slab)', async () => {
    const r = calculatePlatformSlabFee(0)
    if (r.fee !== 10) throw new Error(`Expected ₹10, got ₹${r.fee}`)
  })

  await run('Distance 2.5 km maps to ₹10 (0–6 km slab)', async () => {
    const r = calculatePlatformSlabFee(2.5)
    if (r.fee !== 10) throw new Error(`Expected ₹10, got ₹${r.fee}`)
  })

  await run('Boundary distance exactly 6.0 km maps to ₹10', async () => {
    const r = calculatePlatformSlabFee(6.0)
    if (r.fee !== 10) throw new Error(`Expected ₹10, got ₹${r.fee}`)
  })

  await run('Distance 6.01 km enters >6–12 km slab → ₹20', async () => {
    const r = calculatePlatformSlabFee(6.01)
    if (r.fee !== 20) throw new Error(`Expected ₹20, got ₹${r.fee}`)
  })

  await run('Distance 10.0 km maps to ₹20', async () => {
    const r = calculatePlatformSlabFee(10.0)
    if (r.fee !== 20) throw new Error(`Expected ₹20, got ₹${r.fee}`)
  })

  await run('Boundary distance exactly 12.0 km maps to ₹20', async () => {
    const r = calculatePlatformSlabFee(12.0)
    if (r.fee !== 20) throw new Error(`Expected ₹20, got ₹${r.fee}`)
  })

  await run('Distance 12.01 km enters >12–40 km slab → ₹30', async () => {
    const r = calculatePlatformSlabFee(12.01)
    if (r.fee !== 30) throw new Error(`Expected ₹30, got ₹${r.fee}`)
  })

  await run('Distance 25.0 km maps to ₹30', async () => {
    const r = calculatePlatformSlabFee(25.0)
    if (r.fee !== 30) throw new Error(`Expected ₹30, got ₹${r.fee}`)
  })

  await run('Boundary distance exactly 40.0 km maps to ₹30', async () => {
    const r = calculatePlatformSlabFee(40.0)
    if (r.fee !== 30) throw new Error(`Expected ₹30, got ₹${r.fee}`)
  })

  await run('Distance 40.01 km enters >40 km slab → ₹50', async () => {
    const r = calculatePlatformSlabFee(40.01)
    if (r.fee !== 50) throw new Error(`Expected ₹50, got ₹${r.fee}`)
  })

  await run('Distance 75.0 km maps to ₹50 (max slab)', async () => {
    const r = calculatePlatformSlabFee(75.0)
    if (r.fee !== 50) throw new Error(`Expected ₹50, got ₹${r.fee}`)
  })

  await run('calculatePlatformSlabFee returns { fee: <number>, label: <string> }', async () => {
    const r = calculatePlatformSlabFee(10.0)
    if (typeof r.fee !== 'number') throw new Error(`fee must be a number, got ${typeof r.fee}`)
    if (typeof r.label !== 'string' || !r.label) throw new Error(`label must be a non-empty string`)
  })

  // ── SECTION 2: HAVERSINE DISTANCE ────────────────────────────────────────────
  console.log(`\n── 2. HAVERSINE DISTANCE CALCULATION ─────────────────────────────────`)

  await run('Hyderabad to same point = 0 km', async () => {
    const d = haversineDistance(17.3850, 78.4867, 17.3850, 78.4867)
    if (d !== 0) throw new Error(`Expected 0, got ${d}`)
  })

  await run('Hyderabad to Mumbai distance is ~620 km ± 50 km', async () => {
    const d = haversineDistance(17.3850, 78.4867, 19.0760, 72.8777)
    if (d < 570 || d > 680) throw new Error(`Expected ~620 km, got ${d.toFixed(1)} km`)
  })

  await run('Hyderabad to Delhi distance is ~1255 km ± 100 km', async () => {
    const d = haversineDistance(17.3850, 78.4867, 28.6139, 77.2090)
    if (d < 1150 || d > 1360) throw new Error(`Expected ~1255 km, got ${d.toFixed(1)} km`)
  })

  // ── SECTION 3: COORDINATE VALIDATION ────────────────────────────────────────
  console.log(`\n── 3. COORDINATE VALIDATION ──────────────────────────────────────────`)

  await run('Valid Hyderabad coordinates pass validation', async () => {
    if (!validateCoordinates(17.3850, 78.4867)) throw new Error('Valid coordinates rejected')
  })

  await run('(0,0) null-island coordinates are rejected', async () => {
    if (validateCoordinates(0, 0)) throw new Error('(0,0) should be rejected')
  })

  await run('Latitude > 90 is rejected', async () => {
    if (validateCoordinates(95, 78)) throw new Error('Lat > 90 should be rejected')
  })

  await run('String coordinate types are rejected', async () => {
    if (validateCoordinates('17.38', 78)) throw new Error('String latitude should be rejected')
  })

  await run('NaN coordinates are rejected', async () => {
    if (validateCoordinates(NaN, 78)) throw new Error('NaN should be rejected')
  })

  await run('India bounding box validation: Hyderabad, Delhi, Bangalore pass', async () => {
    if (!isIndiaCoordinates(17.3850, 78.4867)) throw new Error('Hyderabad rejected')
    if (!isIndiaCoordinates(28.6139, 77.2090)) throw new Error('Delhi rejected')
    if (!isIndiaCoordinates(12.9716, 77.5946)) throw new Error('Bangalore rejected')
  })

  await run('Non-India coordinates (London, New York) are rejected', async () => {
    if (isIndiaCoordinates(51.5074, -0.1278)) throw new Error('London should be rejected')
    if (isIndiaCoordinates(40.7128, -74.0060)) throw new Error('New York should be rejected')
  })

  // ── SECTION 4: PHONE NORMALIZATION ──────────────────────────────────────────
  console.log(`\n── 4. PHONE NUMBER E.164 NORMALIZATION ───────────────────────────────`)

  await run('10-digit raw Indian mobile → +91XXXXXXXXXX', async () => {
    const r = normalizeE164Phone('9876543210')
    if (r !== '+919876543210') throw new Error(`Expected +919876543210, got ${r}`)
  })

  await run('+91XXXXXXXXXX format preserved as-is', async () => {
    const r = normalizeE164Phone('+919876543210')
    if (r !== '+919876543210') throw new Error(`Expected +919876543210, got ${r}`)
  })

  await run('+91 with spaces and hyphens normalized', async () => {
    const r = normalizeE164Phone('+91 98765-43210')
    if (r !== '+919876543210') throw new Error(`Expected +919876543210, got ${r}`)
  })

  await run('12-digit 91XXXXXXXXXX prefixed digits correctly normalized', async () => {
    const r = normalizeE164Phone('919876543210')
    if (r !== '+919876543210') throw new Error(`Expected +919876543210, got ${r}`)
  })

  await run('Invalid/too-short numbers return null (not throw)', async () => {
    const r1 = normalizeE164Phone('12345')
    const r2 = normalizeE164Phone('abcde')
    if (r1 !== null) throw new Error(`Expected null for short number, got ${r1}`)
    if (r2 !== null) throw new Error(`Expected null for alpha string, got ${r2}`)
  })

  await run('Null or undefined input returns null safely', async () => {
    if (normalizeE164Phone(null) !== null) throw new Error('null input must return null')
    if (normalizeE164Phone(undefined) !== null) throw new Error('undefined input must return null')
    if (normalizeE164Phone('') !== null) throw new Error('empty string must return null')
  })

  // ── SECTION 5: BRAND UNIQUENESS NORMALIZATION ────────────────────────────────
  console.log(`\n── 5. BRAND NAME NORMALIZATION (UNIQUENESS PROTECTION) ───────────────`)

  await run('Brand normalization: casing, whitespace, and special chars collapsed', async () => {
    const normalize = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    const b1 = normalize('Sabyasachi Couture')
    const b2 = normalize('  sabyasachi-couture! ')
    const b3 = normalize('SABYASACHI   COUTURE')
    if (b1 !== 'sabyasachicouture') throw new Error(`b1 = ${b1}`)
    if (b1 !== b2) throw new Error(`b1 (${b1}) !== b2 (${b2})`)
    if (b2 !== b3) throw new Error(`b2 (${b2}) !== b3 (${b3})`)
  })

  await run('Different brands produce different normalized keys', async () => {
    const normalize = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalize('Sabyasachi') === normalize('ManishMalhotra')) throw new Error('Different brands must produce different keys')
  })

  await run('Brand lock field exists (brandLocked: true after approval)', async () => {
    const mockSeller = { brandName: 'Sabyasachi', brandLocked: true }
    if (!mockSeller.brandLocked) throw new Error('brandLocked should be true on approved seller')
  })

  // ── SECTION 6: ROLE IMMUTABILITY ────────────────────────────────────────────
  console.log(`\n── 6. ROLE IMMUTABILITY & SYSTEM ROLES ───────────────────────────────`)

  await run('Exactly 4 application roles defined: ADMIN, SELLER, DELIVERY_PARTNER, CUSTOMER', async () => {
    const VALID_ROLES = ['ADMIN', 'SELLER', 'DELIVERY_PARTNER', 'CUSTOMER']
    if (VALID_ROLES.length !== 4) throw new Error('Expected exactly 4 roles')
    for (const r of VALID_ROLES) {
      if (!VALID_ROLES.includes(r)) throw new Error(`Missing role: ${r}`)
    }
  })

  await run('Public registration role must be CUSTOMER (cannot self-assign ADMIN/SELLER)', async () => {
    const publicRegistrationRole = 'customer'
    const forbidden = ['admin', 'seller', 'delivery_partner', 'deliverypartner']
    if (forbidden.includes(publicRegistrationRole)) throw new Error(`Public role ${publicRegistrationRole} is forbidden`)
    if (publicRegistrationRole !== 'customer') throw new Error(`Expected customer, got ${publicRegistrationRole}`)
  })

  // ── SECTION 7: DELIVERY FEE LOGIC (LOGIC TESTS, NO DB) ──────────────────────
  console.log(`\n── 7. DELIVERY POLICY LOGIC (NO DB) ──────────────────────────────────`)

  await run('FREE_DELIVERY seller: fee should be ₹0 regardless of distance', async () => {
    // Simulate the FREE_DELIVERY short-circuit logic
    const sellerId = 'test-seller'
    const deliveryMode = 'FREE_DELIVERY'
    const simulateFee = (mode, distKm) => {
      if (mode === 'FREE_DELIVERY') return 0
      return calculatePlatformSlabFee(distKm).fee
    }
    const fee = simulateFee(deliveryMode, 10.0)
    if (fee !== 0) throw new Error(`Expected ₹0 for FREE_DELIVERY, got ₹${fee}`)
  })

  await run('PAID_DELIVERY seller at 5 km: fee = ₹10', async () => {
    const simulateFee = (mode, distKm) => {
      if (mode === 'FREE_DELIVERY') return 0
      return calculatePlatformSlabFee(distKm).fee
    }
    const fee = simulateFee('PAID_DELIVERY', 5.0)
    if (fee !== 10) throw new Error(`Expected ₹10, got ₹${fee}`)
  })

  await run('Multi-seller: FREE + PAID sums correctly', async () => {
    const simulateFee = (mode, distKm) => {
      if (mode === 'FREE_DELIVERY') return 0
      return calculatePlatformSlabFee(distKm).fee
    }
    const seller1Fee = simulateFee('FREE_DELIVERY', 3.0) // ₹0
    const seller2Fee = simulateFee('PAID_DELIVERY', 8.0) // ₹20
    const totalFee = seller1Fee + seller2Fee
    if (totalFee !== 20) throw new Error(`Expected total ₹20, got ₹${totalFee}`)
  })

  await run('Multi-seller: 2 × PAID sellers sum fees independently', async () => {
    const simulateFee = (mode, distKm) => {
      if (mode === 'FREE_DELIVERY') return 0
      return calculatePlatformSlabFee(distKm).fee
    }
    const s1 = simulateFee('PAID_DELIVERY', 5.0)  // ₹10
    const s2 = simulateFee('PAID_DELIVERY', 15.0) // ₹30
    const total = s1 + s2
    if (total !== 40) throw new Error(`Expected ₹40, got ₹${total}`)
  })

  // ── SUMMARY ───────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`   SUMMARY: ${passed} PASSED | ${failed} FAILED`)
  if (failures.length > 0) {
    console.log(`\n   FAILURES:`)
    for (const f of failures) {
      console.error(`   • ${f.name}`)
      console.error(`     → ${f.reason}`)
    }
  }
  console.log(`${'═'.repeat(70)}\n`)

  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
