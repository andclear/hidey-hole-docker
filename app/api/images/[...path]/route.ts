import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    
    if (!path || path.length === 0) {
      return new NextResponse('Not found', { status: 404 });
    }

    const key = path.join('/');
    const storage = await getStorage();
    
    // 获取文件流
    const stream = await storage.getStream ? await storage.getStream(key) : null;
    
    if (!stream) {
        return new NextResponse('Image not found', { status: 404 });
    }

    // 确定 Content-Type
    let contentType = 'application/octet-stream';
    if (key.endsWith('.png')) contentType = 'image/png';
    if (key.endsWith('.webp')) contentType = 'image/webp';
    if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
    if (key.endsWith('.json') || key.endsWith('.jsonl')) contentType = 'application/json';

    return new NextResponse(stream as any, {
        headers: {
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Type': contentType,
        }
    });

  } catch (error) {
    console.error('Image Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
