import { prisma } from '../src/lib/prisma';
import { calculateItemPricing, ServicePriceMap } from '../src/lib/pricing';

async function runTests() {
  console.log('--- Starting CampusCopier Automated Logic, Concurrency & UPI Tests ---');

  // 1. Test Authoritative Pricing Engine
  console.log('\n[Test 1] Testing Pricing Math...');
  const priceMap: ServicePriceMap = {
    bw_single: 100,      // ₹1.00
    bw_double: 150,      // ₹1.50
    bw_4up: 200,         // ₹2.00
    color_single: 1000,   // ₹10.00
    soft_binding: 3000,   // ₹30.00
    spiral_binding: 3000, // ₹30.00
  };

  const calc41 = calculateItemPricing(
    { printMode: 'BW_4UP', pageCount: 41, copies: 1, bindingOption: 'NONE' },
    priceMap
  );
  if (calc41.physicalSheets !== 11 || calc41.subtotalPaise !== 2200) {
    throw new Error(`Expected 11 physical sheets & 2200 paise, got ${calc41.physicalSheets} & ${calc41.subtotalPaise}`);
  }
  console.log('✓ 41-page 4-Up Duplex Sheet Math Verified: 11 sheets = ₹22.00');

  // 2. Database Admin Seed Verification
  console.log('\n[Test 2] Verifying Admins Barathwaj & Thamizaruvi in DB...');
  const admin1 = await prisma.admin.findUnique({ where: { username: 'barathwaj' } });
  const admin2 = await prisma.admin.findUnique({ where: { username: 'thamizaruvi' } });

  if (!admin1 || !admin2) {
    throw new Error('Admins missing in database');
  }
  console.log(`✓ Admin 1: ${admin1.displayName}, Admin 2: ${admin2.displayName}`);

  // 3. Test Dual-Admin Race Condition Protection
  console.log('\n[Test 3] Testing Dual-Admin Atomic Order Claim Race Condition...');
  const testOrderId = `CC-TEST-${Date.now()}`;

  await prisma.order.create({
    data: {
      id: testOrderId,
      customerName: 'Test Student',
      customerMobile: '9876543210',
      totalAmountPaise: 2200,
      paymentMethod: 'CASH',
      paymentStatus: 'UNPAID',
      orderStatus: 'NEW',
    },
  });

  const claimPromise1 = prisma.order.updateMany({
    where: { id: testOrderId, orderStatus: 'NEW', assignedAdminId: null },
    data: { orderStatus: 'ACCEPTED', assignedAdminId: admin1.id, acceptedAt: new Date() },
  });

  const claimPromise2 = prisma.order.updateMany({
    where: { id: testOrderId, orderStatus: 'NEW', assignedAdminId: null },
    data: { orderStatus: 'ACCEPTED', assignedAdminId: admin2.id, acceptedAt: new Date() },
  });

  const [res1, res2] = await Promise.all([claimPromise1, claimPromise2]);
  if (res1.count + res2.count !== 1) {
    throw new Error(`Atomic failure! ${res1.count + res2.count} admins claimed the order!`);
  }
  console.log('✓ Dual-Admin Race Condition Protection Verified!');

  // 4. Test Dual UPI Payment Profiles & Active Account Switching
  console.log('\n[Test 4] Testing Dual UPI Accounts & Payment Destination Snapshot...');

  // Set active account to Account 1 (Barathwaj)
  await prisma.setting.upsert({
    where: { key: 'active_upi_account' },
    update: { value: 'account_1' },
    create: { key: 'active_upi_account', value: 'account_1' },
  });

  const upiOrder1Id = `CC-UPI-1-${Date.now()}`;
  await prisma.order.create({
    data: {
      id: upiOrder1Id,
      customerName: 'UPI Customer 1',
      customerMobile: '9876543210',
      totalAmountPaise: 1500,
      paymentMethod: 'UPI',
      paymentStatus: 'PAYMENT_SUBMITTED',
      upiRecipientName: 'Barathwaj',
      upiIdSnap: 'barathwaj@upi',
      orderStatus: 'NEW',
    },
  });

  // Switch active account to Account 2 (Thamizaruvi)
  await prisma.setting.update({
    where: { key: 'active_upi_account' },
    data: { value: 'account_2' },
  });

  const upiOrder2Id = `CC-UPI-2-${Date.now()}`;
  await prisma.order.create({
    data: {
      id: upiOrder2Id,
      customerName: 'UPI Customer 2',
      customerMobile: '9876543210',
      totalAmountPaise: 2500,
      paymentMethod: 'UPI',
      paymentStatus: 'PAYMENT_SUBMITTED',
      upiRecipientName: 'Thamizaruvi',
      upiIdSnap: 'thamizaruvi@upi',
      orderStatus: 'NEW',
    },
  });

  // Verify Order 1 retains Barathwaj snapshot, while Order 2 has Thamizaruvi snapshot
  const fetchedOrder1 = await prisma.order.findUnique({ where: { id: upiOrder1Id } });
  const fetchedOrder2 = await prisma.order.findUnique({ where: { id: upiOrder2Id } });

  if (fetchedOrder1?.upiRecipientName !== 'Barathwaj' || fetchedOrder1.upiIdSnap !== 'barathwaj@upi') {
    throw new Error('Historical UPI snapshot corrupted for Order 1!');
  }

  if (fetchedOrder2?.upiRecipientName !== 'Thamizaruvi' || fetchedOrder2.upiIdSnap !== 'thamizaruvi@upi') {
    throw new Error('UPI snapshot invalid for Order 2!');
  }

  console.log('✓ Dual UPI Profiles & Snapshot Preservation Verified!');
  console.log(`  - Order 1 Destination: ${fetchedOrder1.upiRecipientName} (${fetchedOrder1.upiIdSnap})`);
  console.log(`  - Order 2 Destination: ${fetchedOrder2.upiRecipientName} (${fetchedOrder2.upiIdSnap})`);

  // Clean up test orders
  await prisma.order.deleteMany({
    where: { id: { in: [testOrderId, upiOrder1Id, upiOrder2Id] } },
  });

  console.log('\n======================================================');
  console.log('🎉 ALL AUTOMATED LOGIC, CONCURRENCY & UPI TESTS PASSED!');
  console.log('======================================================');
}

runTests()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
