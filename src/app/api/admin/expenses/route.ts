import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/expenses - List all consumable purchase logs
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const purchases = await prisma.consumablePurchase.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, purchases });
  } catch (err: any) {
    console.error('Error fetching consumable purchases:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch consumable purchases' },
      { status: 500 }
    );
  }
}

// POST /api/admin/expenses - Log a new consumable purchase
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { itemName, category, quantity, totalCostRupees, notes } = await req.json();

    if (!itemName || !itemName.trim()) {
      return NextResponse.json({ error: 'Consumable item name is required' }, { status: 400 });
    }

    const parsedCostRupees = parseFloat(totalCostRupees);
    if (isNaN(parsedCostRupees) || parsedCostRupees < 0) {
      return NextResponse.json({ error: 'Please enter a valid positive cost amount' }, { status: 400 });
    }

    const totalCostPaise = Math.round(parsedCostRupees * 100);
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    // Fetch active admin's name
    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
    });
    const purchasedBy = admin?.displayName || admin?.username || session.username || 'Admin';

    const newPurchase = await prisma.consumablePurchase.create({
      data: {
        itemName: itemName.trim(),
        category: category?.trim() || 'Consumable',
        quantity: qty,
        totalCostPaise,
        notes: notes?.trim() || null,
        purchasedBy,
      },
    });

    return NextResponse.json({ success: true, purchase: newPurchase });
  } catch (err: any) {
    console.error('Error logging consumable purchase:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to log consumable purchase' },
      { status: 500 }
    );
  }
}
