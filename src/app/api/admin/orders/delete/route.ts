import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { del } from '@vercel/blob';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, paymentProof: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // STRICT SERVER RULE: Only COMPLETED orders can be deleted
    if (order.orderStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only COMPLETED orders can be permanently deleted.' },
        { status: 400 }
      );
    }

    // Safe File Cleanup logic for exclusive customer files
    for (const item of order.items) {
      if (item.sourceType === 'CUSTOMER_UPLOAD' && item.storageKey && item.storageKey.startsWith('http')) {
        // Check if shared by any other order item or Ready Print before deleting
        const otherRefs = await prisma.orderItem.count({
          where: { storageKey: item.storageKey, orderId: { not: orderId } },
        });
        const readyPrintRefs = await prisma.readyPrint.count({
          where: { storageKey: item.storageKey },
        });

        if (otherRefs === 0 && readyPrintRefs === 0) {
          try {
            await del(item.storageKey);
          } catch (e) {
            console.error(`Failed to delete blob ${item.storageKey}:`, e);
          }
        }
      }
    }

    if (order.paymentProof?.storageKey && order.paymentProof.storageKey.startsWith('http')) {
      try {
        await del(order.paymentProof.storageKey);
      } catch (e) {
        console.error(`Failed to delete payment proof blob:`, e);
      }
    }

    // Delete Order database record permanently (cascades to OrderItem & PaymentProof)
    await prisma.order.delete({
      where: { id: orderId },
    });

    return NextResponse.json({ success: true, deletedOrderId: orderId });
  } catch (err: any) {
    console.error('Error deleting order:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete order' },
      { status: 500 }
    );
  }
}
