export {};

import https from 'https';

const BASE_URL = 'https://campus-copier.vercel.app';

async function main() {
  console.log(`--- Starting Live Production Smoke Tests against ${BASE_URL} ---`);

  // 1. Test Public Pricing & Settings Endpoint
  console.log('\n[Live Test 1] Testing GET /api/pricing/public...');
  const publicRes = await fetch(`${BASE_URL}/api/pricing/public`);
  const publicData = await publicRes.json();

  if (!publicRes.ok || !publicData.services || !publicData.settings) {
    throw new Error(`Public endpoint failed: ${JSON.stringify(publicData)}`);
  }
  console.log(`✓ Live Public Endpoint OK! Store Open: ${publicData.settings.acceptingOrders}. Active UPI: ${publicData.settings.activeUpi.displayName} (${publicData.settings.activeUpi.upiId})`);

  // 2. Test Live Admin Login (Barathwaj & Thamizaruvi)
  console.log('\n[Live Test 2] Testing Live Admin Authentication...');
  const loginRes1 = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'barathwaj',
      password: process.env.ADMIN1_PASSWORD || 'BarathwajPassword123!',
    }),
  });
  const loginData1 = await loginRes1.json();
  const cookie1 = loginRes1.headers.get('set-cookie');

  if (!loginRes1.ok || !loginData1.success || !cookie1) {
    throw new Error(`Admin Barathwaj login failed: ${JSON.stringify(loginData1)}`);
  }
  console.log(`✓ Admin Barathwaj authenticated! Session cookie set.`);

  const loginRes2 = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'thamizaruvi',
      password: process.env.ADMIN2_PASSWORD || 'ThamizaruviPassword123!',
    }),
  });
  const loginData2 = await loginRes2.json();
  const cookie2 = loginRes2.headers.get('set-cookie');

  if (!loginRes2.ok || !loginData2.success || !cookie2) {
    throw new Error(`Admin Thamizaruvi login failed: ${JSON.stringify(loginData2)}`);
  }
  console.log(`✓ Admin Thamizaruvi authenticated! Session cookie set.`);

  // 3. Test Live Order Creation (Cash Order)
  console.log('\n[Live Test 3] Testing Live Order Creation (Cash)...');
  const formData = new FormData();
  formData.append('customerName', 'Live Production Student');
  formData.append('customerMobile', '9876543210');
  formData.append('specialInstructions', 'Live production smoke test order');
  formData.append('paymentMethod', 'CASH');
  formData.append(
    'printItems',
    JSON.stringify([
      {
        printMode: 'BW_4UP',
        copies: 1,
        bindingOption: 'SOFT',
      },
    ])
  );

  // Sample 1-page PDF file buffer
  const samplePdf = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n163\n%%EOF'
  );
  const fileBlob = new Blob([samplePdf], { type: 'application/pdf' });
  formData.append('file_0', fileBlob, 'sample_assignment.pdf');

  const createRes = await fetch(`${BASE_URL}/api/orders/create`, {
    method: 'POST',
    body: formData,
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.success || !createData.order?.id) {
    throw new Error(`Live order creation failed: ${JSON.stringify(createData)}`);
  }

  const liveOrderId = createData.order.id;
  console.log(`✓ Live Order Created Successfully! Order ID: ${liveOrderId}, Total: ₹${(createData.order.totalAmountPaise / 100).toFixed(2)}`);

  // 4. Test Dual-Admin Concurrency Claim on Live URL
  console.log('\n[Live Test 4] Testing Dual-Admin Race Condition on Live URL...');
  
  // Barathwaj claims the order first
  const acceptRes1 = await fetch(`${BASE_URL}/api/admin/orders/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ orderId: liveOrderId }),
  });
  const acceptData1 = await acceptRes1.json();

  if (!acceptRes1.ok || !acceptData1.success) {
    throw new Error(`Admin Barathwaj accept failed: ${JSON.stringify(acceptData1)}`);
  }
  console.log(`✓ Admin Barathwaj claimed ${liveOrderId}! Assigned Admin: ${acceptData1.order.assignedAdmin.displayName}`);

  // Thamizaruvi attempts to claim the ALREADY ACCEPTED order
  const acceptRes2 = await fetch(`${BASE_URL}/api/admin/orders/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie2 },
    body: JSON.stringify({ orderId: liveOrderId }),
  });
  const acceptData2 = await acceptRes2.json();

  if (acceptRes2.status !== 409 || !acceptData2.error.includes('Barathwaj')) {
    throw new Error(`Dual-admin claim protection failed! Thamizaruvi got response: ${JSON.stringify(acceptData2)}`);
  }
  console.log(`✓ Race Condition Protection Verified! Thamizaruvi blocked: "${acceptData2.error}"`);

  // 5. Test Status Progression (ACCEPTED -> PRINTING -> COMPLETED)
  console.log('\n[Live Test 5] Testing Order Status Progression...');
  const printRes = await fetch(`${BASE_URL}/api/admin/orders/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ orderId: liveOrderId, targetStatus: 'PRINTING' }),
  });
  const printData = await printRes.json();
  if (!printRes.ok || printData.order.orderStatus !== 'PRINTING') {
    throw new Error(`Failed to set status PRINTING: ${JSON.stringify(printData)}`);
  }
  console.log(`✓ Status updated to PRINTING by ${printData.order.assignedAdmin.displayName}`);

  const completeRes = await fetch(`${BASE_URL}/api/admin/orders/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ orderId: liveOrderId, targetStatus: 'COMPLETED' }),
  });
  const completeData = await completeRes.json();
  if (!completeRes.ok || completeData.order.orderStatus !== 'COMPLETED') {
    throw new Error(`Failed to set status COMPLETED: ${JSON.stringify(completeData)}`);
  }
  console.log(`✓ Status updated to COMPLETED by ${completeData.order.assignedAdmin.displayName}`);

  // 6. Test Orders Open/Closed Master Toggle
  console.log('\n[Live Test 6] Testing Orders Open/Closed Toggle...');
  await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ acceptingOrders: false }),
  });

  const closedRes = await fetch(`${BASE_URL}/api/orders/create`, {
    method: 'POST',
    body: formData,
  });
  const closedData = await closedRes.json();
  if (closedRes.status !== 403) {
    throw new Error(`Orders closed toggle failed to block submission: ${JSON.stringify(closedData)}`);
  }
  console.log(`✓ Store Closed Toggle Verified! Customer request correctly blocked with 403 Forbidden.`);

  // Restore store to open
  await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ acceptingOrders: true }),
  });
  console.log(`✓ Store restored to OPEN.`);

  console.log('\n======================================================');
  console.log(`🎉 ALL LIVE PRODUCTION SMOKE TESTS PASSED ON ${BASE_URL}!`);
  console.log('======================================================');
}

main().catch((err) => {
  console.error('❌ Live production test failed:', err);
  process.exit(1);
});
