import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { del } from '@vercel/blob';

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
      include: { items: true, paymentProof: true },
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

    // Update order status first
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

    // ===== AUTO-CLEANUP: Delete uploaded file blobs on COMPLETED =====
    // IMPORTANT: Only the blob storage is freed. All database log records
    // (Order, OrderItem, PaymentProof) are NEVER deleted. This preserves
    // the complete order history for both admins.
    if (targetStatus === 'COMPLETED') {
      for (const item of existingOrder.items) {
        // Only clean up CUSTOMER_UPLOAD files, NOT READY_PRINT (shared catalog)
        if (
          item.sourceType === 'CUSTOMER_UPLOAD' &&
          item.storageKey &&
          item.storageKey.startsWith('http')
        ) {
          // Ensure no other order or ready print shares this blob
          const otherRefs = await prisma.orderItem.count({
            where: { storageKey: item.storageKey, id: { not: item.id } },
          });
          const readyPrintRefs = await prisma.readyPrint.count({
            where: { storageKey: item.storageKey },
          });

          if (otherRefs === 0 && readyPrintRefs === 0) {
            try {
              await del(item.storageKey);
              console.log(`[Cleanup] Deleted blob for order ${orderId}, item ${item.id}`);
            } catch (e) {
              console.error(`[Cleanup] Failed to delete blob ${item.storageKey}:`, e);
            }
          }

          // Null out the storageKey so the log record survives but blob is freed
          await prisma.orderItem.update({
            where: { id: item.id },
            data: { storageKey: null },
          });
        }

        // Also clean up base64 data URL strings (they bloat the database)
        if (
          item.sourceType === 'CUSTOMER_UPLOAD' &&
          item.storageKey &&
          item.storageKey.startsWith('data:')
        ) {
          await prisma.orderItem.update({
            where: { id: item.id },
            data: { storageKey: null },
          });
          console.log(`[Cleanup] Cleared base64 data for order ${orderId}, item ${item.id}`);
        }
      }

      // Clean up payment proof blob/data too
      if (existingOrder.paymentProof) {
        const proofKey = existingOrder.paymentProof.storageKey;
        if (proofKey && proofKey.startsWith('http')) {
          try {
            await del(proofKey);
            console.log(`[Cleanup] Deleted payment proof blob for order ${orderId}`);
          } catch (e) {
            console.error(`[Cleanup] Failed to delete payment proof blob:`, e);
          }
        }
        // Null out proof storageKey and fileData
        await prisma.paymentProof.update({
          where: { id: existingOrder.paymentProof.id },
          data: { storageKey: null, fileData: null },
        });
      }
    }

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
