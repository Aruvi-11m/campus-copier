import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await prisma.setting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({
    acceptingOrders: settingsMap.accepting_orders !== 'false',
    upiId: settingsMap.upi_id || 'barathwaj@upi',
    pickupInstructions:
      settingsMap.pickup_instructions ||
      'CampusCopier Desk, Main Student Center (9 AM - 6 PM)',
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { acceptingOrders, upiId, pickupInstructions } = await request.json();

    if (typeof acceptingOrders === 'boolean') {
      await prisma.setting.upsert({
        where: { key: 'accepting_orders' },
        update: { value: acceptingOrders ? 'true' : 'false' },
        create: { key: 'accepting_orders', value: acceptingOrders ? 'true' : 'false' },
      });
    }

    if (typeof upiId === 'string') {
      await prisma.setting.upsert({
        where: { key: 'upi_id' },
        update: { value: upiId.trim() },
        create: { key: 'upi_id', value: upiId.trim() },
      });
    }

    if (typeof pickupInstructions === 'string') {
      await prisma.setting.upsert({
        where: { key: 'pickup_instructions' },
        update: { value: pickupInstructions.trim() },
        create: { key: 'pickup_instructions', value: pickupInstructions.trim() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating admin settings:', err);
    return NextResponse.json(
      { error: 'Failed to update settings.' },
      { status: 500 }
    );
  }
}
