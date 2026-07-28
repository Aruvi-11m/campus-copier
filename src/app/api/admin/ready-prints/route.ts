import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { detectPageCountServer } from '@/lib/pricing';

// GET /api/admin/ready-prints
export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await prisma.readyPrint.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, readyPrints: items });
}

// POST /api/admin/ready-prints (Create)
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      category,
      description,
      storageKey,
      fileName,
      mimeType,
      fileSize,
      defaultPrintMode,
      defaultBinding,
      defaultCopies,
      isPublished,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!storageKey) {
      return NextResponse.json({ error: 'Source file is required' }, { status: 400 });
    }

    if (fileSize > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ready Print file exceeds 20MB limit' }, { status: 400 });
    }

    // Detect PDF page count server-side from storageKey URL/data
    let pageCount = 1;
    try {
      let buffer: Buffer | null = null;
      if (storageKey.startsWith('data:')) {
        const base64Str = storageKey.split(',')[1];
        if (base64Str) buffer = Buffer.from(base64Str, 'base64');
      } else {
        const fetchRes = await fetch(storageKey);
        if (fetchRes.ok) {
          const arrayBuf = await fetchRes.arrayBuffer();
          buffer = Buffer.from(arrayBuf);
        }
      }
      if (buffer) {
        pageCount = await detectPageCountServer(buffer, mimeType || 'application/pdf');
      }
    } catch (e) {
      console.error('Failed to detect ReadyPrint page count:', e);
    }

    const newReadyPrint = await prisma.readyPrint.create({
      data: {
        title: title.trim(),
        category: category?.trim() || null,
        description: description?.trim() || null,
        storageKey,
        fileName: fileName || 'document.pdf',
        mimeType: mimeType || 'application/pdf',
        fileSize: fileSize || 0,
        pageCount: Math.max(1, pageCount),
        defaultPrintMode: defaultPrintMode || 'BW_SINGLE',
        defaultBinding: defaultBinding || 'NONE',
        defaultCopies: Math.max(1, parseInt(defaultCopies, 10) || 1),
        isPublished: isPublished ?? true,
        createdByAdminId: session.adminId,
      },
    });

    return NextResponse.json({ success: true, readyPrint: newReadyPrint });
  } catch (err: any) {
    console.error('Error creating ReadyPrint:', err);
    return NextResponse.json({ error: err.message || 'Failed to create Ready Print' }, { status: 500 });
  }
}

// PUT /api/admin/ready-prints (Update)
export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      title,
      category,
      description,
      defaultPrintMode,
      defaultBinding,
      defaultCopies,
      isPublished,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ready Print ID is required' }, { status: 400 });
    }

    const updated = await prisma.readyPrint.update({
      where: { id },
      data: {
        title: title?.trim(),
        category: category?.trim() || null,
        description: description?.trim() || null,
        defaultPrintMode,
        defaultBinding,
        defaultCopies: defaultCopies ? Math.max(1, parseInt(defaultCopies, 10)) : undefined,
        isPublished,
      },
    });

    return NextResponse.json({ success: true, readyPrint: updated });
  } catch (err: any) {
    console.error('Error updating ReadyPrint:', err);
    return NextResponse.json({ error: err.message || 'Failed to update Ready Print' }, { status: 500 });
  }
}

// DELETE /api/admin/ready-prints (Soft Delete / Archive)
export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ready Print ID is required' }, { status: 400 });
    }

    // Soft delete ReadyPrint (unpublish & mark isDeleted true so historical orders stay intact)
    await prisma.readyPrint.update({
      where: { id },
      data: { isDeleted: true, isPublished: false },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting ReadyPrint:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete Ready Print' }, { status: 500 });
  }
}
