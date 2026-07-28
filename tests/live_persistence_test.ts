export {};

const BASE_URL = 'https://campus-copier.vercel.app';

async function main() {
  console.log(`--- Starting Mandatory Production Persistence & Retention Tests against ${BASE_URL} ---`);

  // 1. Login as Admin Barathwaj
  const loginRes1 = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'barathwaj',
      password: process.env.ADMIN1_PASSWORD || 'BarathwajPassword123!',
    }),
  });
  const cookie1 = loginRes1.headers.get('set-cookie');
  if (!loginRes1.ok || !cookie1) throw new Error('Admin 1 login failed');

  // 2. Login as Admin Thamizaruvi
  const loginRes2 = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'thamizaruvi',
      password: process.env.ADMIN2_PASSWORD || 'ThamizaruviPassword123!',
    }),
  });
  const cookie2 = loginRes2.headers.get('set-cookie');
  if (!loginRes2.ok || !cookie2) throw new Error('Admin 2 login failed');

  // Helper to create order
  const createOrder = async (name: string, mobile: string) => {
    const formData = new FormData();
    formData.append('customerName', name);
    formData.append('customerMobile', mobile);
    formData.append('paymentMethod', 'CASH');
    formData.append(
      'printItems',
      JSON.stringify([{ printMode: 'BW_SINGLE', copies: 1, bindingOption: 'NONE' }])
    );
    const samplePdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n163\n%%EOF'
    );
    formData.append('file_0', new Blob([samplePdf], { type: 'application/pdf' }), `${name.replace(/\s+/g, '_')}.pdf`);
    const res = await fetch(`${BASE_URL}/api/orders/create`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(`Create order failed: ${JSON.stringify(data)}`);
    return data.order.id;
  };

  // 3. Create Orders A, B, C, D
  console.log('\n[Step 1] Creating 4 Test Orders (A, B, C, D)...');
  const orderA = await createOrder('Student A (New)', '9876543211');
  const orderB = await createOrder('Student B (Accepted)', '9876543212');
  const orderC = await createOrder('Student C (Printing)', '9876543213');
  const orderD = await createOrder('Student D (Completed)', '9876543214');
  console.log(`✓ Orders created: A=${orderA}, B=${orderB}, C=${orderC}, D=${orderD}`);

  // Transition Order B to ACCEPTED
  await fetch(`${BASE_URL}/api/admin/orders/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ orderId: orderB }),
  });

  // Transition Order C to ACCEPTED -> PRINTING
  await fetch(`${BASE_URL}/api/admin/orders/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie2 },
    body: JSON.stringify({ orderId: orderC }),
  });
  await fetch(`${BASE_URL}/api/admin/orders/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie2 },
    body: JSON.stringify({ orderId: orderC, targetStatus: 'PRINTING' }),
  });

  // Transition Order D to ACCEPTED -> PRINTING -> COMPLETED
  await fetch(`${BASE_URL}/api/admin/orders/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ orderId: orderD }),
  });
  await fetch(`${BASE_URL}/api/admin/orders/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ orderId: orderD, targetStatus: 'PRINTING' }),
  });
  await fetch(`${BASE_URL}/api/admin/orders/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
    body: JSON.stringify({ orderId: orderD, targetStatus: 'COMPLETED' }),
  });

  console.log('✓ Status transitions persisted: A=NEW, B=ACCEPTED, C=PRINTING, D=COMPLETED');

  // 4. Query Admin Orders and verify persisted state across database fetch
  console.log('\n[Step 2] Querying Admin Orders Dashboard API...');
  const ordersRes = await fetch(`${BASE_URL}/api/admin/orders`, {
    headers: { Cookie: cookie1 },
  });
  const ordersData = await ordersRes.json();

  if (!ordersRes.ok || !ordersData.orders) {
    throw new Error(`Admin fetch failed: ${JSON.stringify(ordersData)}`);
  }

  const fetchedA = ordersData.orders.find((o: any) => o.id === orderA);
  const fetchedB = ordersData.orders.find((o: any) => o.id === orderB);
  const fetchedC = ordersData.orders.find((o: any) => o.id === orderC);
  const fetchedD = ordersData.orders.find((o: any) => o.id === orderD);

  if (!fetchedA || fetchedA.orderStatus !== 'NEW') throw new Error(`Order A invalid status`);
  if (!fetchedB || fetchedB.orderStatus !== 'ACCEPTED') throw new Error(`Order B invalid status`);
  if (!fetchedC || fetchedC.orderStatus !== 'PRINTING') throw new Error(`Order C invalid status`);
  if (!fetchedD || fetchedD.orderStatus !== 'COMPLETED') throw new Error(`Order D invalid status`);

  console.log('✓ Admin Dashboard API verified:');
  console.log(`  - Order A (${orderA}): Status = ${fetchedA.orderStatus}`);
  console.log(`  - Order B (${orderB}): Status = ${fetchedB.orderStatus}, Assigned = ${fetchedB.assignedAdmin?.displayName}`);
  console.log(`  - Order C (${orderC}): Status = ${fetchedC.orderStatus}, Assigned = ${fetchedC.assignedAdmin?.displayName}`);
  console.log(`  - Order D (${orderD}): Status = ${fetchedD.orderStatus}, Assigned = ${fetchedD.assignedAdmin?.displayName}`);

  // 5. Verify File Payload Persistence
  console.log('\n[Step 3] Verifying File Data Persistence on Completed Order D...');
  if (!fetchedD.items || fetchedD.items.length === 0 || !fetchedD.items[0].fileData) {
    throw new Error('Completed Order D is missing persisted file data!');
  }
  console.log(`✓ Completed Order D file payload verified! (${fetchedD.items[0].fileName}, ${fetchedD.items[0].fileData.substring(0, 30)}...)`);

  console.log('\n======================================================');
  console.log(`🎉 MANDATORY PRODUCTION PERSISTENCE VERIFICATION PASSED!`);
  console.log(`   Managed Database: Neon PostgreSQL`);
  console.log(`   Persistent Storage: Database Byte Payload`);
  console.log('======================================================');
}

main().catch((err) => {
  console.error('❌ Persistence test failed:', err);
  process.exit(1);
});
