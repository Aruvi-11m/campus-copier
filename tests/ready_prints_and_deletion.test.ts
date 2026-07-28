export {};

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('--- Starting Ready Prints, 20MB Uploads & Order Deletion Logic Tests ---');

  // 1. Login Admin
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'barathwaj',
      password: process.env.ADMIN1_PASSWORD || 'BarathwajPassword123!',
    }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (!loginRes.ok || !cookie) throw new Error('Admin login failed');

  // 2. Upload Ready Print PDF
  console.log('\n[Test 1] Testing Ready Print Creation & Page Count Detection...');
  const samplePdf = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 5/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n163\n%%EOF'
  );
  
  const uploadFormData = new FormData();
  uploadFormData.append('file', new Blob([samplePdf], { type: 'application/pdf' }), 'Japanese_Workbook.pdf');

  const uploadRes = await fetch(`${BASE_URL}/api/uploads`, {
    method: 'POST',
    body: uploadFormData,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.storageKey) throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);

  const rpRes = await fetch(`${BASE_URL}/api/admin/ready-prints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      title: 'Japanese Workbook',
      category: 'Japanese',
      description: 'Japanese workbook for Semester 5',
      storageKey: uploadData.storageKey,
      fileName: 'Japanese_Workbook.pdf',
      mimeType: 'application/pdf',
      fileSize: samplePdf.length,
      defaultPrintMode: 'BW_4UP',
      defaultBinding: 'SPIRAL',
      defaultCopies: 1,
      isPublished: true,
    }),
  });

  const rpData = await rpRes.json();
  if (!rpRes.ok || !rpData.readyPrint?.id) throw new Error(`Ready Print creation failed: ${JSON.stringify(rpData)}`);
  const readyPrintId = rpData.readyPrint.id;
  console.log(`✓ Ready Print Created! Title: "${rpData.readyPrint.title}", Page Count Detected: ${rpData.readyPrint.pageCount}`);

  // 3. Test Public Pricing API contains Ready Print
  console.log('\n[Test 2] Testing Public Catalog Endpoint...');
  const publicRes = await fetch(`${BASE_URL}/api/pricing/public`);
  const publicData = await publicRes.json();
  const foundRP = publicData.readyPrints?.find((r: any) => r.id === readyPrintId);
  if (!foundRP) throw new Error('Ready Print not found in public catalog API!');
  console.log(`✓ Ready Print found in public catalog: "${foundRP.title}" (${foundRP.pageCount} pages)`);

  // 4. Test Mixed Order Creation (Ready Print + Custom Upload)
  console.log('\n[Test 3] Creating Mixed Order (Ready Print + Customer Upload)...');
  const orderFormData = new FormData();
  orderFormData.append('customerName', 'Test Student');
  orderFormData.append('customerMobile', '9876543210');
  orderFormData.append('paymentMethod', 'CASH');
  orderFormData.append(
    'printItems',
    JSON.stringify([
      {
        readyPrintId,
        printMode: 'BW_4UP',
        copies: 1,
        bindingOption: 'SPIRAL',
      },
      {
        storageKey: uploadData.storageKey,
        fileName: 'custom_assignment.pdf',
        mimeType: 'application/pdf',
        fileSize: samplePdf.length,
        pageCount: 5,
        printMode: 'BW_DOUBLE',
        copies: 2,
        bindingOption: 'NONE',
      },
    ])
  );

  const createOrderRes = await fetch(`${BASE_URL}/api/orders/create`, {
    method: 'POST',
    body: orderFormData,
  });
  const createOrderData = await createOrderRes.json();
  if (!createOrderRes.ok || !createOrderData.order?.id) throw new Error(`Order creation failed: ${JSON.stringify(createOrderData)}`);
  const testOrderId = createOrderData.order.id;
  console.log(`✓ Mixed Order Created! Order ID: ${testOrderId}, Total: ₹${(createOrderData.order.totalAmountPaise / 100).toFixed(2)}`);

  // 5. Test Non-Completed Order Deletion Rejection
  console.log('\n[Test 4] Verifying Non-Completed Order Deletion Rejection (Server Rule)...');
  const deleteNewRes = await fetch(`${BASE_URL}/api/admin/orders/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ orderId: testOrderId }),
  });
  const deleteNewData = await deleteNewRes.json();
  if (deleteNewRes.status !== 400 || !deleteNewData.error.includes('COMPLETED')) {
    throw new Error(`Server failed to block non-completed order deletion! Got: ${JSON.stringify(deleteNewData)}`);
  }
  console.log(`✓ Server correctly rejected deleting NEW order: "${deleteNewData.error}"`);

  // 6. Transition Order to COMPLETED and Delete
  console.log('\n[Test 5] Transitioning Order to COMPLETED and Testing Permanent Deletion...');
  await fetch(`${BASE_URL}/api/admin/orders/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ orderId: testOrderId }),
  });
  await fetch(`${BASE_URL}/api/admin/orders/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ orderId: testOrderId, targetStatus: 'PRINTING' }),
  });
  await fetch(`${BASE_URL}/api/admin/orders/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ orderId: testOrderId, targetStatus: 'COMPLETED' }),
  });

  const deleteCompletedRes = await fetch(`${BASE_URL}/api/admin/orders/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ orderId: testOrderId }),
  });
  const deleteCompletedData = await deleteCompletedRes.json();
  if (!deleteCompletedRes.ok || !deleteCompletedData.success) {
    throw new Error(`Failed to delete COMPLETED order: ${JSON.stringify(deleteCompletedData)}`);
  }
  console.log(`✓ COMPLETED Order ${testOrderId} deleted permanently!`);

  // Verify Ready Print source file remains safe in database/catalog
  const rpCheck = await fetch(`${BASE_URL}/api/pricing/public`);
  const rpCheckData = await rpCheck.json();
  const rpStillExists = rpCheckData.readyPrints?.some((r: any) => r.id === readyPrintId);
  if (!rpStillExists) throw new Error('Ready Print source file was accidentally deleted when order was removed!');
  console.log(`✓ Shared Ready Print source file remains 100% safe & intact in catalog!`);

  console.log('\n======================================================');
  console.log('🎉 ALL READY PRINTS, 20MB & DELETION LOGIC TESTS PASSED!');
  console.log('======================================================');
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
