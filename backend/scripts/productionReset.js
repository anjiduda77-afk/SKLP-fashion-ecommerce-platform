/**
 * SKLP PRODUCTION RESET SCRIPT
 * ============================================================
 * Safely clears all demo/seed data from the production database.
 * Does NOT drop collections, indexes, or schemas.
 *
 * Usage:
 *   node scripts/productionReset.js --dry-run   (count only, no deletions)
 *   node scripts/productionReset.js              (interactive — prompts for 'yes')
 *   node scripts/productionReset.js --verify     (check final state after reset)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Model Imports ───────────────────────────────────────────
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import Campaign from '../models/Campaign.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import Analytics from '../models/Analytics.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Seller from '../models/Seller.js';
import SellerApplication from '../models/SellerApplication.js';
import SellerSettlement from '../models/SellerSettlement.js';
import SellerOffer from '../models/SellerOffer.js';
import MarketingAuditLog from '../models/MarketingAuditLog.js';
import MarketingAsset from '../models/MarketingAsset.js';

// ── Helpers ─────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerify = args.includes('--verify');

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

function hr(char = '─', len = 70) { return char.repeat(len); }

// ── Count Report ─────────────────────────────────────────────
async function printCountReport(label = 'CURRENT DATABASE STATE') {
  const [
    totalUsers, adminUsers, sellerUsers, deliveryUsers, customerUsers,
    products, orders, carts, wishlists, coupons, banners, campaigns,
    notifications, reviews, analytics, payments, subscriptions,
    sellerApps, sellerSettlements, sellerOffers, auditLogs, assets
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: { $in: ['delivery', 'deliverypartner'] } }),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({}),
    Order.countDocuments({}),
    Cart.countDocuments({}),
    Wishlist.countDocuments({}),
    Coupon.countDocuments({}),
    Banner.countDocuments({}),
    Campaign.countDocuments({}),
    Notification.countDocuments({}),
    Review.countDocuments({}),
    Analytics.countDocuments({}),
    Payment.countDocuments({}),
    Subscription.countDocuments({}),
    SellerApplication.countDocuments({}),
    SellerSettlement.countDocuments({}),
    SellerOffer.countDocuments({}),
    MarketingAuditLog.countDocuments({}),
    MarketingAsset.countDocuments({}),
  ]);

  console.log('\n' + hr('═'));
  console.log(`  📊 ${label}`);
  console.log(hr('═'));
  console.log(`  Users Total:          ${totalUsers}`);
  console.log(`    ├─ Admins:          ${adminUsers}`);
  console.log(`    ├─ Sellers:         ${sellerUsers}`);
  console.log(`    ├─ Delivery:        ${deliveryUsers}`);
  console.log(`    └─ Customers:       ${customerUsers}`);
  console.log(`  Products:             ${products}`);
  console.log(`  Orders:               ${orders}`);
  console.log(`  Carts:                ${carts}`);
  console.log(`  Wishlists:            ${wishlists}`);
  console.log(`  Reviews:              ${reviews}`);
  console.log(`  Coupons:              ${coupons}`);
  console.log(`  Banners:              ${banners}`);
  console.log(`  Campaigns:            ${campaigns}`);
  console.log(`  Notifications:        ${notifications}`);
  console.log(`  Analytics:            ${analytics}`);
  console.log(`  Payments:             ${payments}`);
  console.log(`  Subscriptions:        ${subscriptions}`);
  console.log(`  Seller Applications:  ${sellerApps}`);
  console.log(`  Seller Settlements:   ${sellerSettlements}`);
  console.log(`  Seller Offers:        ${sellerOffers}`);
  console.log(`  Marketing Audit Logs: ${auditLogs}`);
  console.log(`  Marketing Assets:     ${assets}`);
  console.log(hr('═'));

  const total = totalUsers + products + orders + carts + wishlists + coupons +
    banners + campaigns + notifications + reviews + analytics + payments +
    subscriptions + sellerApps + sellerSettlements + sellerOffers + auditLogs + assets;

  console.log(`  TOTAL RECORDS:        ${total}\n`);
  return total;
}

// ── Execute Reset ─────────────────────────────────────────────
async function executeReset() {
  console.log('\n  🗑️  Deleting all demo/test data...\n');

  const results = await Promise.allSettled([
    User.deleteMany({}).then(r => ({ col: 'Users', count: r.deletedCount })),
    Product.deleteMany({}).then(r => ({ col: 'Products', count: r.deletedCount })),
    Order.deleteMany({}).then(r => ({ col: 'Orders', count: r.deletedCount })),
    Cart.deleteMany({}).then(r => ({ col: 'Carts', count: r.deletedCount })),
    Wishlist.deleteMany({}).then(r => ({ col: 'Wishlists', count: r.deletedCount })),
    Review.deleteMany({}).then(r => ({ col: 'Reviews', count: r.deletedCount })),
    Coupon.deleteMany({}).then(r => ({ col: 'Coupons', count: r.deletedCount })),
    Banner.deleteMany({}).then(r => ({ col: 'Banners', count: r.deletedCount })),
    Campaign.deleteMany({}).then(r => ({ col: 'Campaigns', count: r.deletedCount })),
    Notification.deleteMany({}).then(r => ({ col: 'Notifications', count: r.deletedCount })),
    Analytics.deleteMany({}).then(r => ({ col: 'Analytics', count: r.deletedCount })),
    Payment.deleteMany({}).then(r => ({ col: 'Payments', count: r.deletedCount })),
    Subscription.deleteMany({}).then(r => ({ col: 'Subscriptions', count: r.deletedCount })),
    Seller.deleteMany({}).then(r => ({ col: 'Sellers', count: r.deletedCount })),
    SellerApplication.deleteMany({}).then(r => ({ col: 'Seller Applications', count: r.deletedCount })),
    SellerSettlement.deleteMany({}).then(r => ({ col: 'Seller Settlements', count: r.deletedCount })),
    SellerOffer.deleteMany({}).then(r => ({ col: 'Seller Offers', count: r.deletedCount })),
    MarketingAuditLog.deleteMany({}).then(r => ({ col: 'Marketing Audit Logs', count: r.deletedCount })),
    MarketingAsset.deleteMany({}).then(r => ({ col: 'Marketing Assets', count: r.deletedCount })),
  ]);

  let totalDeleted = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { col, count } = result.value;
      console.log(`  ✅  ${col}: ${count} records removed`);
      totalDeleted += count;
    } else {
      console.error(`  ❌  Error: ${result.reason?.message || result.reason}`);
    }
  }
  console.log(`\n  Total records deleted: ${totalDeleted}\n`);
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n' + hr('═'));
  console.log('  🚀 SKLP PRODUCTION RESET SCRIPT');
  console.log(hr('═'));
  console.log(`  Database: ${process.env.MONGODB_URI?.split('@')[1]?.split('?')[0] || 'Unknown'}`);
  console.log(`  Mode:     ${isDryRun ? 'DRY RUN (no deletions)' : isVerify ? 'VERIFY ONLY' : 'LIVE RESET'}`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('  ✅ MongoDB connected\n');

  if (isVerify) {
    await printCountReport('POST-RESET VERIFICATION');
    await mongoose.disconnect();
    return;
  }

  const totalBefore = await printCountReport('RECORDS THAT WILL BE DELETED');

  if (isDryRun) {
    console.log('  ℹ️  DRY RUN complete — no data was modified.');
    console.log('     Run without --dry-run to execute the actual reset.\n');
    await mongoose.disconnect();
    return;
  }

  if (totalBefore === 0) {
    console.log('  ℹ️  Database is already empty. Nothing to delete.\n');
    await mongoose.disconnect();
    return;
  }

  console.log('  ⚠️  WARNING: This will PERMANENTLY DELETE all records above.');
  console.log('     MongoDB indexes and schemas will be preserved.');
  console.log('     This action CANNOT be undone.\n');

  const answer = await prompt('  Type "yes" to confirm and proceed: ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('\n  ❌ Reset cancelled. No data was modified.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log();
  await executeReset();
  await printCountReport('FINAL STATE AFTER RESET');

  console.log('  🎉 Production database reset complete!');
  console.log('  👉 Next step: node scripts/setupAdminAccount.js\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error during reset:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
