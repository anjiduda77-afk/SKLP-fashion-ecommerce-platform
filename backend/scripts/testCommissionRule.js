import assert from 'assert';
import {
  DEFAULT_COMMISSION_RATE,
  MAX_COMMISSION_PER_UNIT,
  calculateUnitCommission,
  calculateItemCommission,
  calculateSuborderCommission,
  calculatePartialRefundCommission
} from '../utils/commissionUtils.js';

console.log('────────────────────────────────────────────────────────────────────────');
console.log('  STYLE STREET — OFFICIAL COMMISSION RULE AUTOMATED TEST SUITE          ');
console.log('  Formula: commission = min(eligible_product_price * 0.05, 21) per unit ');
console.log('────────────────────────────────────────────────────────────────────────\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}\n`);
    throw err;
  }
}

// ── TEST 1: Official Promp Examples ──────────────────────────────────────────
runTest('Official Prompt Example: ₹100 product → ₹5 commission', () => {
  const comm = calculateUnitCommission(100);
  assert.strictEqual(comm, 5.0, `Expected 5.00, received ${comm}`);
});

runTest('Official Prompt Example: ₹200 product → ₹10 commission', () => {
  const comm = calculateUnitCommission(200);
  assert.strictEqual(comm, 10.0, `Expected 10.00, received ${comm}`);
});

runTest('Official Prompt Example: ₹400 product → ₹20 commission', () => {
  const comm = calculateUnitCommission(400);
  assert.strictEqual(comm, 20.0, `Expected 20.00, received ${comm}`);
});

runTest('Official Prompt Example: ₹500 product → ₹21 commission (capped)', () => {
  const comm = calculateUnitCommission(500);
  assert.strictEqual(comm, 21.0, `Expected 21.00, received ${comm}`);
});

runTest('Official Prompt Example: ₹1,000 product → ₹21 commission (capped)', () => {
  const comm = calculateUnitCommission(1000);
  assert.strictEqual(comm, 21.0, `Expected 21.00, received ${comm}`);
});

// ── TEST 2: Threshold Testing (Below, At, and Above ₹420) ────────────────────
// Since 5% of ₹420 is ₹21, ₹420 is the exact threshold boundary.
runTest('Boundary: Price strictly below ₹420 (₹419 → ₹20.95)', () => {
  const comm = calculateUnitCommission(419);
  assert.strictEqual(comm, 20.95, `Expected 20.95, received ${comm}`);
});

runTest('Boundary: Price exactly at ₹420 (₹420 → ₹21.00)', () => {
  const comm = calculateUnitCommission(420);
  assert.strictEqual(comm, 21.0, `Expected 21.00, received ${comm}`);
});

runTest('Boundary: Price strictly above ₹420 (₹421 → capped at ₹21.00)', () => {
  const comm = calculateUnitCommission(421);
  assert.strictEqual(comm, 21.0, `Expected 21.00, received ${comm}`);
});

runTest('Boundary: Ultra-luxury item (₹15,000 → capped at ₹21.00)', () => {
  const comm = calculateUnitCommission(15000);
  assert.strictEqual(comm, 21.0, `Expected 21.00, received ${comm}`);
});

runTest('Boundary: Free/Zero price item (₹0 → ₹0.00 commission)', () => {
  const comm = calculateUnitCommission(0);
  assert.strictEqual(comm, 0.0, `Expected 0.00, received ${comm}`);
});

// ── TEST 3: Multi-Unit Per-Unit Capping (Never cap order at ₹21) ─────────────
runTest('Multi-Unit: 3 units of ₹500 product → 3 × ₹21 = ₹63 commission', () => {
  const item = { price: 500, finalPrice: 1500, quantity: 3 };
  const calc = calculateItemCommission(item);
  assert.strictEqual(calc.unitCommission, 21.0);
  assert.strictEqual(calc.totalCommission, 63.0, `Expected 63.00, received ${calc.totalCommission}`);
  assert.strictEqual(calc.sellerTotalPayout, 1437.0); // 1500 - 63 = 1437
});

runTest('Multi-Unit: 5 units of ₹1,000 product → 5 × ₹21 = ₹105 commission', () => {
  const item = { price: 1000, finalPrice: 5000, quantity: 5 };
  const calc = calculateItemCommission(item);
  assert.strictEqual(calc.unitCommission, 21.0);
  assert.strictEqual(calc.totalCommission, 105.0, `Expected 105.00, received ${calc.totalCommission}`);
  assert.strictEqual(calc.sellerTotalPayout, 4895.0); // 5000 - 105 = 4895
});

runTest('Multi-Unit: 4 units of ₹100 product → 4 × ₹5 = ₹20 commission', () => {
  const item = { price: 100, finalPrice: 400, quantity: 4 };
  const calc = calculateItemCommission(item);
  assert.strictEqual(calc.unitCommission, 5.0);
  assert.strictEqual(calc.totalCommission, 20.0, `Expected 20.00, received ${calc.totalCommission}`);
  assert.strictEqual(calc.sellerTotalPayout, 380.0); // 400 - 20 = 380
});

// ── TEST 4: Pricing with Discounts ──────────────────────────────────────────
runTest('Discounts: Item MRP ₹800 with 50% discount → net ₹400 → ₹20 commission', () => {
  const item = { price: 800, discount: 50, quantity: 1 };
  const calc = calculateItemCommission(item);
  assert.strictEqual(calc.eligibleUnitPrice, 400.0);
  assert.strictEqual(calc.unitCommission, 20.0);
  assert.strictEqual(calc.totalCommission, 20.0);
});

runTest('Discounts: Item MRP ₹1,000 with 20% discount → net ₹800 → ₹21 commission (capped)', () => {
  const item = { price: 1000, discount: 20, quantity: 1 };
  const calc = calculateItemCommission(item);
  assert.strictEqual(calc.eligibleUnitPrice, 800.0);
  assert.strictEqual(calc.unitCommission, 21.0);
  assert.strictEqual(calc.totalCommission, 21.0);
});

runTest('Discounts: Order-level coupon discount distributed to line item', () => {
  // Line item of 2 units @ ₹500 = ₹1,000 finalPrice, receives ₹100 coupon discount share
  // Net line = ₹900 -> net unit = ₹450 (> ₹420 threshold) -> capped at ₹21/unit -> total = ₹42
  const item = { finalPrice: 1000, quantity: 2, couponDiscountShare: 100 };
  const calc = calculateItemCommission(item);
  assert.strictEqual(calc.eligibleUnitPrice, 450.0);
  assert.strictEqual(calc.unitCommission, 21.0);
  assert.strictEqual(calc.totalCommission, 42.0);
  assert.strictEqual(calc.sellerTotalPayout, 858.0); // 900 - 42 = 858
});

// ── TEST 5: Multi-Item Suborder Calculation ─────────────────────────────────
runTest('Suborder: Mixed items with uncapped and capped units', () => {
  const items = [
    { name: 'Casual T-Shirt', price: 200, finalPrice: 400, quantity: 2 }, // 200 * 0.05 = 10 * 2 = 20
    { name: 'Designer Jacket', price: 600, finalPrice: 600, quantity: 1 }, // min(600 * 0.05, 21) = 21 * 1 = 21
    { name: 'Silk Scarf', price: 1000, finalPrice: 3000, quantity: 3 }     // min(1000 * 0.05, 21) = 21 * 3 = 63
  ];

  const suborderCalc = calculateSuborderCommission(items, 5, 21);
  assert.strictEqual(suborderCalc.subtotal, 4000.0);
  // Total commission: 20 + 21 + 63 = 104
  assert.strictEqual(suborderCalc.platformCommission, 104.0, `Expected 104.00, received ${suborderCalc.platformCommission}`);
  // Seller payout: 4000 - 104 = 3896
  assert.strictEqual(suborderCalc.sellerPayout, 3896.0, `Expected 3896.00, received ${suborderCalc.sellerPayout}`);
  assert.strictEqual(suborderCalc.items.length, 3);
});

// ── TEST 6: Cancellations & Partial Refunds ──────────────────────────────────
runTest('Partial Refund: Capped item (4 units of ₹500, refund 1 unit)', () => {
  const item = { price: 500, finalPrice: 2000, quantity: 4 };
  const refund = calculatePartialRefundCommission(item, 1, 5, 21);

  assert.strictEqual(refund.originalQuantity, 4);
  assert.strictEqual(refund.refundedQuantity, 1);
  assert.strictEqual(refund.remainingQuantity, 3);
  assert.strictEqual(refund.unitCommission, 21.0);
  assert.strictEqual(refund.refundedCommission, 21.0); // 1 * 21
  assert.strictEqual(refund.remainingCommission, 63.0); // 3 * 21
  assert.strictEqual(refund.refundedSubtotal, 500.0);
  assert.strictEqual(refund.remainingSubtotal, 1500.0);
  assert.strictEqual(refund.refundedSellerPayout, 479.0); // 500 - 21
  assert.strictEqual(refund.remainingSellerPayout, 1437.0); // 1500 - 63
});

runTest('Partial Refund: Uncapped item (3 units of ₹200, refund 1 unit)', () => {
  const item = { price: 200, finalPrice: 600, quantity: 3 };
  const refund = calculatePartialRefundCommission(item, 1, 5, 21);

  assert.strictEqual(refund.originalQuantity, 3);
  assert.strictEqual(refund.refundedQuantity, 1);
  assert.strictEqual(refund.remainingQuantity, 2);
  assert.strictEqual(refund.unitCommission, 10.0);
  assert.strictEqual(refund.refundedCommission, 10.0); // 1 * 10
  assert.strictEqual(refund.remainingCommission, 20.0); // 2 * 10
  assert.strictEqual(refund.refundedSellerPayout, 190.0); // 200 - 10
  assert.strictEqual(refund.remainingSellerPayout, 380.0); // 400 - 20
});

runTest('Full Cancellation: All units refunded (3 units of ₹600)', () => {
  const item = { price: 600, finalPrice: 1800, quantity: 3 };
  const refund = calculatePartialRefundCommission(item, 3, 5, 21);

  assert.strictEqual(refund.refundedQuantity, 3);
  assert.strictEqual(refund.remainingQuantity, 0);
  assert.strictEqual(refund.refundedCommission, 63.0); // 3 * 21
  assert.strictEqual(refund.remainingCommission, 0.0);
  assert.strictEqual(refund.remainingSellerPayout, 0.0);
});

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log(`  ALL ${testsPassed}/${testsTotal} AUTOMATED COMMISSION TESTS PASSED PERFECTLY!`);
console.log('────────────────────────────────────────────────────────────────────────\n');
