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

  const upiAccounts = await prisma.upiAccount.findMany({
    orderBy: { id: 'asc' },
  });

  const account1 = upiAccounts.find((a) => a.id === 'account_1') || {
    id: 'account_1',
    displayName: 'Barathwaj',
    upiId: 'barathwaj@upi',
    isEnabled: true,
  };

  const account2 = upiAccounts.find((a) => a.id === 'account_2') || {
    id: 'account_2',
    displayName: 'Thamizaruvi',
    upiId: 'thamizaruvi@upi',
    isEnabled: true,
  };

  return NextResponse.json({
    acceptingOrders: settingsMap.accepting_orders !== 'false',
    activeUpiAccount: settingsMap.active_upi_account || 'account_1',
    account1,
    account2,
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
    const { acceptingOrders, activeUpiAccount, account1, account2, pickupInstructions } =
      await request.json();

    if (typeof acceptingOrders === 'boolean') {
      await prisma.setting.upsert({
        where: { key: 'accepting_orders' },
        update: { value: acceptingOrders ? 'true' : 'false' },
        create: { key: 'accepting_orders', value: acceptingOrders ? 'true' : 'false' },
      });
    }

    if (activeUpiAccount === 'account_1' || activeUpiAccount === 'account_2') {
      await prisma.setting.upsert({
        where: { key: 'active_upi_account' },
        update: { value: activeUpiAccount },
        create: { key: 'active_upi_account', value: activeUpiAccount },
      });
    }

    if (account1 && typeof account1.displayName === 'string' && typeof account1.upiId === 'string') {
      await prisma.upiAccount.upsert({
        where: { id: 'account_1' },
        update: {
          displayName: account1.displayName.trim(),
          upiId: account1.upiId.trim(),
          isEnabled: account1.isEnabled !== false,
        },
        create: {
          id: 'account_1',
          displayName: account1.displayName.trim(),
          upiId: account1.upiId.trim(),
          isEnabled: account1.isEnabled !== false,
        },
      });
    }

    if (account2 && typeof account2.displayName === 'string' && typeof account2.upiId === 'string') {
      await prisma.upiAccount.upsert({
        where: { id: 'account_2' },
        update: {
          displayName: account2.displayName.trim(),
          upiId: account2.upiId.trim(),
          isEnabled: account2.isEnabled !== false,
        },
        create: {
          id: 'account_2',
          displayName: account2.displayName.trim(),
          upiId: account2.upiId.trim(),
          isEnabled: account2.isEnabled !== false,
        },
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
