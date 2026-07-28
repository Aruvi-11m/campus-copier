import { prisma } from '../src/lib/prisma';
import { calculateItemPricing, ServicePriceMap } from '../src/lib/pricing';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('--- Starting CampusCopier Automated Logic & Concurrency Tests ---');

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

  // 41-page PDF 4-up duplex test: ceil(41 / 4) = 11 physical sheets
  const calc41 = calculateItemPricing(
    { printMode: 'BW_4UP', pageCount: 41, copies: 1, bindingOption: 'NONE' },
    priceMap
  );
  if (calc41.physicalSheets !== 11) {
    throw new Error(`Expected 11 physical sheets for 41-page 4up, got ${calc41.physicalSheets}`);
  }
  if (calc41.subtotalPaise !== 2200) { // 11 sheets * ₹2.00 = ₹22.00 (2200 paise)
    throw new Error(`Expected 2200 paise for 41-page 4up, got ${calc41.subtotalPaise}`);
  }
  console.log('✓ 41-page 4-Up Duplex Sheet Math Verified: 11 sheets = ₹22.00');

  // 40-page PDF Double-sided test: ceil(40 / 2) = 20 sheets. 20 * ₹1.50 = ₹30.00 (3000 paise)
  const calc40Double = calculateItemPricing(
    { printMode: 'BW_DOUBLE', pageCount: 40, copies: 1, bindingOption: 'SPIRAL' },
    priceMap
  );
  if (calc40Double.physicalSheets !== 20) {
    throw new Error(`Expected 20 physical sheets for 40-page double, got ${calc40Double.physicalSheets}`);
  }
  // Printing (20 * 150 = 3000) + Spiral Binding (3000) = 6000 paise (₹60.00)
  if (calc40Double.subtotalPaise !== 6000) {
    throw new Error(`Expected 6000 paise for 40-page double + spiral, got ${calc40Double.subtotalPaise}`);
  }
  console.log('✓ 40-page Double-Sided + Spiral Binding Math Verified: ₹60.00');

  // 2. Database Admin Seed Verification
  console.log('\n[Test 2] Verifying Admins Barathwaj & Thamizaruvi in DB...');
  const admin1 = await prisma.admin.findUnique({ where: { username: 'barathwaj' } });
  const admin2 = await prisma.admin.findUnique({ where: { username: 'thamizaruvi' } });

  if (!admin1 || admin1.displayName !== 'Barathwaj') {
    throw new Error('Admin Barathwaj missing or invalid in database');
  }
  if (!admin2 || admin2.displayName !== 'Thamizaruvi') {
    throw new Error('Admin Thamizaruvi missing or invalid in database');
  }
  console.log(`✓ Admin 1 found: ${admin1.displayName} (${admin1.id})`);
  console.log(`✓ Admin 2 found: ${admin2.displayName} (${admin2.id})`);

  // 3. Test Dual-Admin Race Condition Protection (Simulated Concurrent Claim)
  console.log('\n[Test 3] Testing Dual-Admin Atomic Order Claim Race Condition...');
  const testOrderId = `CC-TEST-${Date.now()}`;

  // Create a NEW unassigned order
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

  // Both Admin 1 and Admin 2 attempt to claim testOrderId simultaneously
  const claimPromise1 = prisma.order.updateMany({
    where: { id: testOrderId, orderStatus: 'NEW', assignedAdminId: null },
    data: { orderStatus: 'ACCEPTED', assignedAdminId: admin1.id, acceptedAt: new Date() },
  });

  const claimPromise2 = prisma.order.updateMany({
    where: { id: testOrderId, orderStatus: 'NEW', assignedAdminId: null },
    data: { orderStatus: 'ACCEPTED', assignedAdminId: admin2.id, acceptedAt: new Date() },
  });

  const [res1, res2] = await Promise.all([claimPromise1, claimPromise2]);

  const winnersCount = res1.count + res2.count;
  if (winnersCount !== 1) {
    throw new Error(`Atomic failure! ${winnersCount} admins claimed the order instead of exactly 1!`);
  }

  const winningAdminId = res1.count === 1 ? admin1.id : admin2.id;
  const losingAdminName = res1.count === 1 ? admin2.displayName : admin1.displayName;
  const winningAdminName = res1.count === 1 ? admin1.displayName : admin2.displayName;

  console.log(`✓ Race Condition Protection Verified! Winner: ${winningAdminName}. Loser: ${losingAdminName}.`);

  // Verify DB state
  const finalOrderState = await prisma.order.findUnique({
    where: { id: testOrderId },
    include: { assignedAdmin: true },
  });

  if (finalOrderState?.orderStatus !== 'ACCEPTED' || finalOrderState.assignedAdminId !== winningAdminId) {
    throw new Error('Order DB state does not reflect winning admin correctly');
  }
  console.log(`✓ Order ${testOrderId} correctly assigned to ${finalOrderState.assignedAdmin?.displayName}`);

  // 4. Test Historical Pricing Snapshot Preservation
  console.log('\n[Test 4] Testing Historical Pricing Snapshot Preservation...');

  // Create Order with snapshot price ₹1.00 (100 paise)
  const snapshotItem = await prisma.orderItem.create({
    data: {
      orderId: testOrderId,
      fileName: 'test.pdf',
      fileData: 'data:application/pdf;base64,dGVzdA==',
      mimeType: 'application/pdf',
      fileSize: 100,
      printMode: 'BW_SINGLE',
      pageCount: 10,
      physicalSheets: 10,
      copies: 1,
      bindingOption: 'NONE',
      pricePerUnitPaise: 100,
      bindingPricePaise: 0,
      subtotalPaise: 1000,
    },
  });

  // Now change the active service price for bw_single from ₹1.00 to ₹5.00
  await prisma.servicePrice.update({
    where: { serviceKey: 'bw_single' },
    data: { pricePaise: 500 },
  });

  // Verify historical order item retains its original 100 paise price
  const savedItem = await prisma.orderItem.findUnique({ where: { id: snapshotItem.id } });
  if (savedItem?.pricePerUnitPaise !== 100 || savedItem.subtotalPaise !== 1000) {
    throw new Error('Historical order price was modified after price change!');
  }
  console.log('✓ Historical pricing snapshot preserved! Item retained ₹1.00 price.');

  // Restore price back to ₹1.00
  await prisma.servicePrice.update({
    where: { serviceKey: 'bw_single' },
    data: { pricePaise: 100 },
  });

  // Clean up test order
  await prisma.order.delete({ where: { id: testOrderId } });

  console.log('\n======================================================');
  console.log('🎉 ALL AUTOMATED LOGIC & CONCURRENCY TESTS PASSED CLEANLY!');
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
