import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prices = await prisma.servicePrice.findMany({
    orderBy: { serviceKey: 'asc' },
  });

  return NextResponse.json({ prices });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { serviceKey, priceRupees, isEnabled } = await request.json();

    if (!serviceKey) {
      return NextResponse.json({ error: 'Service key is required.' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isEnabled === 'boolean') {
      updateData.isEnabled = isEnabled;
    }
    if (priceRupees !== undefined) {
      const parsedRupees = parseFloat(priceRupees);
      if (isNaN(parsedRupees) || parsedRupees < 0) {
        return NextResponse.json({ error: 'Invalid price value.' }, { status: 400 });
      }
      updateData.pricePaise = Math.round(parsedRupees * 100);
    }

    const updated = await prisma.servicePrice.update({
      where: { serviceKey },
      data: updateData,
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (err: any) {
    console.error('Error updating pricing:', err);
    return NextResponse.json(
      { error: 'Failed to update pricing.' },
      { status: 500 }
    );
  }
}
