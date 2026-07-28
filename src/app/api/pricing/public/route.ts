import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const services = await prisma.servicePrice.findMany({
      where: { isEnabled: true },
    });

    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const activeAccountId = settingsMap.active_upi_account || 'account_1';
    const activeUpi = await prisma.upiAccount.findUnique({
      where: { id: activeAccountId },
    });

    const displayName = activeUpi?.displayName || 'Barathwaj';
    const upiId = activeUpi?.upiId || 'barathwaj@upi';

    // Generate base UPI Deep Link string (amount is formatted dynamically on client)
    const upiUrlTemplate = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(displayName)}&cu=INR`;

    // Generate sample QR code data URL
    let qrDataUrl = activeUpi?.qrCodeData || null;
    if (!qrDataUrl) {
      try {
        qrDataUrl = await QRCode.toDataURL(upiUrlTemplate, { margin: 2, width: 250 });
      } catch (err) {
        console.error('Error generating QR Code:', err);
      }
    }

    const readyPrints = await prisma.readyPrint.findMany({
      where: { isPublished: true, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        pageCount: true,
        defaultPrintMode: true,
        defaultBinding: true,
        defaultCopies: true,
        fileName: true,
      },
    });

    return NextResponse.json({
      services: services.map((s) => ({
        serviceKey: s.serviceKey,
        name: s.name,
        unit: s.unit,
        pricePaise: s.pricePaise,
        priceRupees: (s.pricePaise / 100).toFixed(2),
      })),
      readyPrints,
      settings: {
        acceptingOrders: settingsMap.accepting_orders !== 'false',
        activeUpi: {
          accountId: activeAccountId,
          displayName,
          upiId,
          qrDataUrl,
          upiUrlTemplate,
        },
        pickupInstructions:
          settingsMap.pickup_instructions ||
          'CampusCopier Desk, Main Student Center (9 AM - 6 PM)',
      },
    });
  } catch (err: any) {
    console.error('Error fetching public pricing & settings:', err);
    return NextResponse.json(
      { error: 'Failed to load pricing info.' },
      { status: 500 }
    );
  }
}
