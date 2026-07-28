import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId, targetStatus, markPaid } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const updateData: any = {};

    if (markPaid) {
      updateData.paymentStatus = 'PAID';
    }

    if (targetStatus) {
      if (targetStatus === 'PRINTING') {
        updateData.orderStatus = 'PRINTING';
        updateData.printingStartedAt = new Date();
      } else if (targetStatus === 'COMPLETED') {
        updateData.orderStatus = 'COMPLETED';
        updateData.completedAt = new Date();
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        assignedAdmin: {
          select: { id: true, username: true, displayName: true },
        },
        items: true,
        paymentProof: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (err: any) {
    console.error('Error updating order status:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error updating order status.' },
      { status: 500 }
    );
  }
}
