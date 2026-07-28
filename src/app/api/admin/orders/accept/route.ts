import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    // Atomic compare-and-set query to prevent race condition between dual admins
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        orderStatus: 'NEW',
        assignedAdminId: null,
      },
      data: {
        orderStatus: 'ACCEPTED',
        assignedAdminId: session.adminId,
        acceptedAt: new Date(),
      },
    });

    if (result.count === 0) {
      // Race lost! Query current order state to find out who claimed it
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { assignedAdmin: true },
      });

      const claimedByName = existingOrder?.assignedAdmin?.displayName || 'another admin';
      return NextResponse.json(
        {
          error: `This order has already been accepted by ${claimedByName}.`,
          assignedAdminName: claimedByName,
          currentStatus: existingOrder?.orderStatus || 'ACCEPTED',
        },
        { status: 409 }
      );
    }

    // Success! Fetch updated order with assigned admin info
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
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
      message: `Order accepted successfully by ${session.displayName}.`,
    });
  } catch (err: any) {
    console.error('Error accepting order:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while accepting order.' },
      { status: 500 }
    );
  }
}
