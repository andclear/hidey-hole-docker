import { NextRequest, NextResponse } from 'next/server';
import { getS3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// This is a helper to proxy images if no public URL is available
// Or to generate presigned URLs on the fly (better for security)
// Usage: /api/images/cards/hash.png

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    // Wait for params
    const { path } = await params;
    
    if (!path || path.length === 0) {
      return new NextResponse('Not found', { status: 404 });
    }

    const key = path.join('/');

    const { client: s3, bucket } = await getS3Client();

    // Option A: Generate Presigned URL and Redirect (Best for performance)
    // We can also check if we have a public URL configured in settings
    // But for now, presigned URL is safest.
    
    // Add Cache-Control header to redirect to allow browser caching of the redirect itself?
    // Usually 307 Temporary Redirect is not cached by default, 301 is.
    // Presigned URLs expire, so we shouldn't cache the redirect for too long.
    // But we can cache it for say 50 minutes (expiresIn is 60 min).
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    return NextResponse.redirect(url, {
        status: 307,
        headers: {
            'Cache-Control': 'public, max-age=3000, s-maxage=3000', // Cache redirect for 50 mins
        }
    });

    // Option B: Stream file through Next.js (High bandwidth usage, but works if bucket is private and no CORS)
    // For now, redirect is better.

  } catch (error) {
    console.error('Image Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
