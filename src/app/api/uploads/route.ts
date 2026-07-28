import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds the 20MB maximum size limit.` },
        { status: 400 }
      );
    }

    const mimeType = file.type || 'application/pdf';
    const fileName = file.name || 'document.pdf';
    let storageKey = '';

    // If Vercel Blob Token exists in environment, upload to Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN.includes('local_dev')) {
      const blob = await put(fileName, file, {
        access: 'public',
        contentType: mimeType,
      });
      storageKey = blob.url;
    } else {
      // Local / standard server fallback: store as Data URL string
      const buffer = Buffer.from(await file.arrayBuffer());
      storageKey = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    return NextResponse.json({
      success: true,
      storageKey,
      fileName,
      mimeType,
      fileSize: file.size,
    });
  } catch (err: any) {
    console.error('Upload endpoint error:', err);
    return NextResponse.json(
      { error: err.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
