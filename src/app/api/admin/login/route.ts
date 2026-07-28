import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createAdminSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    const admin = await prisma.admin.findUnique({
      where: { username: cleanUsername },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid admin username or password.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid admin username or password.' },
        { status: 401 }
      );
    }

    await createAdminSession({
      adminId: admin.id,
      username: admin.username,
      displayName: admin.displayName,
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
      },
    });
  } catch (err: any) {
    console.error('Error during admin login:', err);
    return NextResponse.json(
      { error: 'Internal server error during login.' },
      { status: 500 }
    );
  }
}
