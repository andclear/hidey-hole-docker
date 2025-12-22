
import { NextRequest, NextResponse } from 'next/server';
import { getStorageClient } from '@/lib/storage/client';

// GET: Get presigned URL for a specific chat file
export async function POST(
  request: NextRequest
) {
  try {
    const { key } = await request.json();
    
    if (!key) {
        return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const storage = await getStorageClient();
    const url = await storage.getSignedUrl(key);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Presigned URL Error", error);
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }
}
