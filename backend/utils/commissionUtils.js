/**
 * STYLE STREET — Platform Commission Engine
 *
 * Official Rule:
 * - Platform commission rate: 5% of eligible product price
 * - Maximum commission: ₹21 per eligible product unit
 * - Formula: commission = min(eligible_product_price * 0.05, 21)
 *
 * Examples:
 * - ₹100 product  → ₹5 commission
 * - ₹200 product  → ₹10 commission
 * - ₹400 product  → ₹20 commission
 * - ₹420 product  → ₹21 commission (Threshold: 420 * 0.05 = 21)
 * - ₹500 product  → ₹21 commission (Capped)
 * - ₹1,000 product → ₹21 commission (Capped)
 *
 * Multi-unit rule:
 * For multiple units, commission is calculated per unit and summed:
 * totalCommission = sum(unitCommission * quantity)
 * The whole order or line is NEVER incorrectly capped at ₹21.
 */

export const DEFAULT_COMMISSION_RATE = 5; // 5%
export const MAX_COMMISSION_PER_UNIT = 21; // ₹21 cap per eligible unit

/**
 * Calculates platform commission for a single product unit.
 *
 * @param {number} eligibleUnitPrice - Net eligible price of one unit
 * @param {number} [commissionRate=5] - Percentage commission rate
 * @param {number} [maxCap=21] - Per-unit maximum commission cap in INR
 * @returns {number} Calculated commission for one unit, rounded to 2 decimals
 */
export const calculateUnitCommission = (
  eligibleUnitPrice,
  commissionRate = DEFAULT_COMMISSION_RATE,
  maxCap = MAX_COMMISSION_PER_UNIT
) => {
  const price = Math.max(0, Number(eligibleUnitPrice) || 0);
  const rate = Math.max(0, Number(commissionRate) || DEFAULT_COMMISSION_RATE);
  const cap = Math.max(0, Number(maxCap) || MAX_COMMISSION_PER_UNIT);

  const rawPercentCommission = (price * rate) / 100;
  const unitCommission = Math.min(rawPercentCommission, cap);
  return parseFloat(unitCommission.toFixed(2));
};

/**
 * Calculates commission and seller earnings for a line item with quantity.
 *
 * @param {Object} item - Cart or order item
 * @param {number} [commissionRate=5] - Commission percentage
 * @param {number} [maxCap=21] - Max per-unit cap
 * @returns {Object} Commission breakdown including eligible unit price and total line commission
 */
export const calculateItemCommission = (
  item,
  commissionRate = DEFAULT_COMMISSION_RATE,
  maxCap = MAX_COMMISSION_PER_UNIT
) => {
  const quantity = Math.max(1, parseInt(item?.quantity, 10) || 1);

  let eligibleUnitPrice = 0;
  if (typeof item?.finalPrice === 'number' && !isNaN(item.finalPrice)) {
    const couponShare = Number(item.couponDiscountShare) || 0;
    const netLine = Math.max(0, item.finalPrice - couponShare);
    eligibleUnitPrice = netLine / quantity;
  } else if (typeof item?.price === 'number' && !isNaN(item.price)) {
    const discountPercent = Number(item.discount) || 0;
    const discountedPrice = item.price - (item.price * discountPercent / 100);
    const couponShare = Number(item.couponDiscountShare) || 0;
    const netLine = Math.max(0, (discountedPrice * quantity) - couponShare);
    eligibleUnitPrice = netLine / quantity;
  } else if (typeof item?.unitPrice === 'number' && !isNaN(item.unitPrice)) {
    eligibleUnitPrice = item.unitPrice;
  }

  eligibleUnitPrice = parseFloat(eligibleUnitPrice.toFixed(2));
  const unitCommission = calculateUnitCommission(eligibleUnitPrice, commissionRate, maxCap);
  const totalCommission = parseFloat((unitCommission * quantity).toFixed(2));
  const lineSubtotal = parseFloat((eligibleUnitPrice * quantity).toFixed(2));
  const sellerTotalPayout = Math.max(0, parseFloat((lineSubtotal - totalCommission).toFixed(2)));
  const sellerUnitPayout = parseFloat((sellerTotalPayout / quantity).toFixed(2));

  return {
    eligibleUnitPrice,
    quantity,
    commissionRate,
    maxCommissionPerUnit: maxCap,
    unitCommission,
    totalCommission,
    sellerUnitPayout,
    sellerTotalPayout,
    isCapped: unitCommission >= maxCap && (eligibleUnitPrice * (commissionRate / 100)) > maxCap
  };
};

/**
 * Calculates suborder platform commission and seller payout across multiple items.
 *
 * @param {Array} items - Items belonging to the seller suborder
 * @param {number} [commissionRate=5] - Commission rate percentage
 * @param {number} [maxCap=21] - Max commission per unit
 * @returns {Object} { subtotal, commissionRate, maxCommissionPerUnit, platformCommission, sellerPayout, items }
 */
export const calculateSuborderCommission = (
  items = [],
  commissionRate = DEFAULT_COMMISSION_RATE,
  maxCap = MAX_COMMISSION_PER_UNIT
) => {
  let subtotal = 0;
  let platformCommission = 0;
  const processedItems = [];

  for (const rawItem of items) {
    const itemSubtotal = typeof rawItem.finalPrice === 'number'
      ? rawItem.finalPrice
      : ((rawItem.price || 0) * (rawItem.quantity || 1));
    subtotal += itemSubtotal;

    const breakdown = calculateItemCommission(rawItem, commissionRate, maxCap);
    platformCommission += breakdown.totalCommission;

    processedItems.push({
      ...rawItem,
      eligibleUnitPrice: breakdown.eligibleUnitPrice,
      commissionPerUnit: breakdown.unitCommission,
      itemCommission: breakdown.totalCommission,
      isCommissionCapped: breakdown.isCapped,
      sellerUnitPayout: breakdown.sellerUnitPayout,
      sellerTotalPayout: breakdown.sellerTotalPayout
    });
  }

  subtotal = parseFloat(subtotal.toFixed(2));
  platformCommission = parseFloat(platformCommission.toFixed(2));
  const sellerPayout = Math.max(0, parseFloat((subtotal - platformCommission).toFixed(2)));

  return {
    subtotal,
    commissionRate,
    maxCommissionPerUnit: maxCap,
    platformCommission,
    sellerPayout,
    items: processedItems
  };
};

/**
 * Calculates commission adjustment for cancellations and partial refunds.
 *
 * @param {Object} item - Original item
 * @param {number} refundedUnits - Number of units refunded / returned
 * @param {number} [commissionRate=5]
 * @param {number} [maxCap=21]
 * @returns {Object} Refund and remaining commission breakdown
 */
export const calculatePartialRefundCommission = (
  item,
  refundedUnits,
  commissionRate = DEFAULT_COMMISSION_RATE,
  maxCap = MAX_COMMISSION_PER_UNIT
) => {
  const origQty = Math.max(1, parseInt(item.quantity, 10) || 1);
  const refundQty = Math.min(origQty, Math.max(0, parseInt(refundedUnits, 10) || 0));
  const remainingQty = origQty - refundQty;

  const itemCalc = calculateItemCommission(item, commissionRate, maxCap);
  const unitCommission = itemCalc.unitCommission;
  const refundedCommission = parseFloat((unitCommission * refundQty).toFixed(2));
  const remainingCommission = parseFloat((unitCommission * remainingQty).toFixed(2));

  const refundedSubtotal = parseFloat((itemCalc.eligibleUnitPrice * refundQty).toFixed(2));
  const remainingSubtotal = parseFloat((itemCalc.eligibleUnitPrice * remainingQty).toFixed(2));

  const refundedSellerPayout = Math.max(0, parseFloat((refundedSubtotal - refundedCommission).toFixed(2)));
  const remainingSellerPayout = Math.max(0, parseFloat((remainingSubtotal - remainingCommission).toFixed(2)));

  return {
    originalQuantity: origQty,
    refundedQuantity: refundQty,
    remainingQuantity: remainingQty,
    eligibleUnitPrice: itemCalc.eligibleUnitPrice,
    unitCommission,
    refundedCommission,
    remainingCommission,
    refundedSubtotal,
    remainingSubtotal,
    refundedSellerPayout,
    remainingSellerPayout
  };
};

export default {
  DEFAULT_COMMISSION_RATE,
  MAX_COMMISSION_PER_UNIT,
  calculateUnitCommission,
  calculateItemCommission,
  calculateSuborderCommission,
  calculatePartialRefundCommission
};
