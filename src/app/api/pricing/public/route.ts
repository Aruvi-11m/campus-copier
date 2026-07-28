import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json({
      services: services.map((s) => ({
        serviceKey: s.serviceKey,
        name: s.name,
        unit: s.unit,
        pricePaise: s.pricePaise,
        priceRupees: (s.pricePaise / 100).toFixed(2),
      })),
      settings: {
        acceptingOrders: settingsMap.accepting_orders !== 'false',
        upiId: settingsMap.upi_id || 'barathwaj@upi',
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
