import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. All Orders & Order Items
    const orders = await prisma.order.findMany({
      include: {
        assignedAdmin: {
          select: { id: true, username: true, displayName: true },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. All Consumable Purchases
    const purchases = await prisma.consumablePurchase.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 3. Compute Metrics
    let totalRevenuePaise = 0;
    let totalPagesPrinted = 0;

    const adminStats: Record<
      string,
      {
        displayName: string;
        ordersAccepted: number;
        ordersCompleted: number;
        pagesPrinted: number;
        revenuePaise: number;
        expensesPaise: number;
      }
    > = {};

    // Initialize admins in system
    const dbAdmins = await prisma.admin.findMany({
      select: { id: true, username: true, displayName: true },
    });
    for (const a of dbAdmins) {
      adminStats[a.id] = {
        displayName: a.displayName,
        ordersAccepted: 0,
        ordersCompleted: 0,
        pagesPrinted: 0,
        revenuePaise: 0,
        expensesPaise: 0,
      };
    }

    for (const o of orders) {
      // Calculate revenue from paid or completed orders
      if (o.paymentStatus === 'PAID' || o.orderStatus === 'COMPLETED') {
        totalRevenuePaise += o.totalAmountPaise;
      }

      let orderPages = 0;
      for (const item of o.items) {
        const pages = item.pageCount * item.copies;
        totalPagesPrinted += pages;
        orderPages += pages;
      }

      if (o.assignedAdminId && adminStats[o.assignedAdminId]) {
        adminStats[o.assignedAdminId].ordersAccepted += 1;
        if (o.orderStatus === 'COMPLETED') {
          adminStats[o.assignedAdminId].ordersCompleted += 1;
        }
        if (o.paymentStatus === 'PAID' || o.orderStatus === 'COMPLETED') {
          adminStats[o.assignedAdminId].revenuePaise += o.totalAmountPaise;
        }
        adminStats[o.assignedAdminId].pagesPrinted += orderPages;
      }
    }

    let totalExpensesPaise = 0;
    for (const p of purchases) {
      totalExpensesPaise += p.totalCostPaise;

      // Associate expenses by admin name if matching
      const matchingAdmin = dbAdmins.find(
        (a) =>
          a.displayName.toLowerCase() === p.purchasedBy.toLowerCase() ||
          a.username.toLowerCase() === p.purchasedBy.toLowerCase()
      );
      if (matchingAdmin && adminStats[matchingAdmin.id]) {
        adminStats[matchingAdmin.id].expensesPaise += p.totalCostPaise;
      }
    }

    const netProfitPaise = totalRevenuePaise - totalExpensesPaise;
    const costPerPagePaise =
      totalPagesPrinted > 0
        ? Math.round(totalExpensesPaise / totalPagesPrinted)
        : 0;

    // 4. Generate daily chart data for visual Control Chart
    const dailyMap: Record<
      string,
      { date: string; revenue: number; expenses: number; profit: number; pages: number }
    > = {};

    // Group orders by date (YYYY-MM-DD)
    for (const o of orders) {
      if (o.paymentStatus === 'PAID' || o.orderStatus === 'COMPLETED') {
        const dStr = new Date(o.createdAt).toISOString().split('T')[0];
        if (!dailyMap[dStr]) {
          dailyMap[dStr] = { date: dStr, revenue: 0, expenses: 0, profit: 0, pages: 0 };
        }
        dailyMap[dStr].revenue += o.totalAmountPaise / 100;
        let pCount = 0;
        for (const item of o.items) {
          pCount += item.pageCount * item.copies;
        }
        dailyMap[dStr].pages += pCount;
      }
    }

    // Group expenses by date
    for (const p of purchases) {
      const dStr = new Date(p.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dStr]) {
        dailyMap[dStr] = { date: dStr, revenue: 0, expenses: 0, profit: 0, pages: 0 };
      }
      dailyMap[dStr].expenses += p.totalCostPaise / 100;
    }

    // Sort dates and calculate profit
    const chartData = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        profit: d.revenue - d.expenses,
      }));

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenueRupees: (totalRevenuePaise / 100).toFixed(2),
        totalExpensesRupees: (totalExpensesPaise / 100).toFixed(2),
        netProfitRupees: (netProfitPaise / 100).toFixed(2),
        totalPagesPrinted,
        costPerPageRupees: (costPerPagePaise / 100).toFixed(2),
      },
      adminStats: Object.values(adminStats),
      chartData,
      purchases,
    });
  } catch (err: any) {
    console.error('Accounting API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch accounting metrics' },
      { status: 500 }
    );
  }
}
