import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateItemPricing,
  detectPageCountServer,
  ServicePriceMap,
} from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Check if accepting orders is enabled
    const openSetting = await prisma.setting.findUnique({
      where: { key: 'accepting_orders' },
    });
    if (openSetting?.value === 'false') {
      return NextResponse.json(
        { error: 'Orders are temporarily closed by the administrator.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const customerName = formData.get('customerName')?.toString().trim();
    const customerMobile = formData.get('customerMobile')?.toString().trim();
    const specialInstructions = formData.get('specialInstructions')?.toString().trim() || null;
    const paymentMethod = formData.get('paymentMethod')?.toString().trim(); // "UPI" | "CASH"
    const printItemsJson = formData.get('printItems')?.toString();

    if (!customerName || !customerMobile || !paymentMethod || !printItemsJson) {
      return NextResponse.json(
        { error: 'Missing required customer details or print items.' },
        { status: 400 }
      );
    }

    // Basic mobile validation (e.g. 10 digits for Indian mobile numbers)
    const mobileDigits = customerMobile.replace(/\D/g, '');
    if (mobileDigits.length < 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const rawItems = JSON.parse(printItemsJson);
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one print item is required.' },
        { status: 400 }
      );
    }

    // 2. Fetch current service prices from database
    const dbPrices = await prisma.servicePrice.findMany({
      where: { isEnabled: true },
    });

    const priceMap: ServicePriceMap = {
      bw_single: 100,
      bw_double: 150,
      bw_4up: 200,
      color_single: 1000,
      soft_binding: 3000,
      spiral_binding: 3000,
    };

    for (const p of dbPrices) {
      if (p.serviceKey in priceMap) {
        priceMap[p.serviceKey as keyof ServicePriceMap] = p.pricePaise;
      }
    }

    // 3. Process each print item and calculate authoritative pricing
    let totalAmountPaise = 0;
    const processedItems = [];

    for (let i = 0; i < rawItems.length; i++) {
      const itemConfig = rawItems[i];
      const fileKey = `file_${i}`;
      const file = formData.get(fileKey) as File | null;

      if (!file) {
        return NextResponse.json(
          { error: `Missing uploaded file for item ${i + 1}.` },
          { status: 400 }
        );
      }

      // Max single file size validation (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds the 25MB maximum size limit.` },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || 'application/pdf';

      // Detect PDF page count server-side authoritatively
      const detectedPages = await detectPageCountServer(fileBuffer, mimeType);

      const copies = Math.max(1, parseInt(itemConfig.copies, 10) || 1);
      const printMode = itemConfig.printMode || 'BW_SINGLE';
      const bindingOption = itemConfig.bindingOption || 'NONE';

      const calculated = calculateItemPricing(
        {
          printMode,
          pageCount: detectedPages,
          copies,
          bindingOption,
        },
        priceMap
      );

      totalAmountPaise += calculated.subtotalPaise;

      // Base64 file string for persistent DB storage
      const fileBase64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

      processedItems.push({
        fileName: file.name,
        fileData: fileBase64,
        mimeType,
        fileSize: file.size,
        printMode: calculated.printMode,
        pageCount: calculated.pageCount,
        physicalSheets: calculated.physicalSheets,
        copies: calculated.copies,
        bindingOption: calculated.bindingOption,
        pricePerUnitPaise: calculated.pricePerUnitPaise,
        bindingPricePaise: calculated.bindingPricePaise,
        subtotalPaise: calculated.subtotalPaise,
      });
    }

    // 4. Handle Payment Proof for UPI if uploaded
    let paymentProofData: string | null = null;
    if (paymentMethod === 'UPI') {
      const proofFile = formData.get('paymentScreenshot') as File | null;
      if (proofFile && proofFile.size > 0) {
        if (proofFile.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'Payment screenshot exceeds 10MB size limit.' },
            { status: 400 }
          );
        }
        const proofBuffer = Buffer.from(await proofFile.arrayBuffer());
        const proofMime = proofFile.type || 'image/png';
        paymentProofData = `data:${proofMime};base64,${proofBuffer.toString('base64')}`;
      }
    }

    // 5. Generate unique Order ID (e.g. CC-1001)
    const count = await prisma.order.count();
    const orderId = `CC-${1001 + count}`;

    const paymentStatus =
      paymentMethod === 'UPI' && paymentProofData
        ? 'PAYMENT_SUBMITTED'
        : 'UNPAID';

    // 6. Create Order atomically in Database
    const order = await prisma.order.create({
      data: {
        id: orderId,
        customerName,
        customerMobile: mobileDigits,
        specialInstructions,
        pickupMethod: 'College Pickup',
        totalAmountPaise,
        paymentMethod,
        paymentStatus,
        orderStatus: 'NEW',
        items: {
          create: processedItems.map((item) => ({
            fileName: item.fileName,
            fileData: item.fileData,
            mimeType: item.mimeType,
            fileSize: item.fileSize,
            printMode: item.printMode,
            pageCount: item.pageCount,
            physicalSheets: item.physicalSheets,
            copies: item.copies,
            bindingOption: item.bindingOption,
            pricePerUnitPaise: item.pricePerUnitPaise,
            bindingPricePaise: item.bindingPricePaise,
            subtotalPaise: item.subtotalPaise,
          })),
        },
        paymentProof: paymentProofData
          ? {
              create: {
                fileData: paymentProofData,
              },
            }
          : undefined,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        customerName: order.customerName,
        customerMobile: order.customerMobile,
        totalAmountPaise: order.totalAmountPaise,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        pickupMethod: order.pickupMethod,
        createdAt: order.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while creating order.' },
      { status: 500 }
    );
  }
}
