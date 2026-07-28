import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'ALL';

  const whereClause: any = {};
  if (statusFilter !== 'ALL') {
    whereClause.orderStatus = statusFilter;
  }

  try {
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        assignedAdmin: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        items: true,
        paymentProof: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error('Error fetching admin orders:', err);
    return NextResponse.json(
      { error: 'Failed to fetch orders.' },
      { status: 500 }
    );
  }
}
