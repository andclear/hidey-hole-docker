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

    const { client: s3, bucket, publicUrl } = await getS3Client();

    // 策略调整：始终优先使用 Vercel 代理模式 (Proxy Mode)
    // 原因：
    // 1. Vercel Edge 节点在国内访问速度通常优于 R2/S3 直连。
    // 2. 解决 R2 在国内被墙或连接不稳定的问题。
    // 3. 利用 Vercel 强大的 CDN 缓存能力。
    // 4. 彻底解决 URL 签名过期导致的图片消失问题。

    // 只有当获取 S3 客户端彻底失败时，才考虑其他方案（但这里直接报错即可）
    
    const command = new GetObjectCommand({
      Bucket: bucket || undefined,
      Key: key,
    });
    
    const response = await s3.send(command);
    
    if (!response.Body) {
        return new NextResponse('Image not found', { status: 404 });
    }

    // 将 S3 的流转换为 Web 标准流
    const webStream = response.Body.transformToWebStream();
    
    // 确定 Content-Type
    let contentType = response.ContentType || 'application/octet-stream';
    if (key.endsWith('.png')) contentType = 'image/png';
    if (key.endsWith('.webp')) contentType = 'image/webp';
    if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';

    return new NextResponse(webStream, {
        headers: {
            // 永久缓存 (1年)，因为我们的文件名包含 hash，内容不可变
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Type': contentType,
            // 可选：透传 Content-Length (如果 S3 返回了的话)
            ...(response.ContentLength && { 'Content-Length': response.ContentLength.toString() }),
        }
    });

    // 下面的代码已废弃：不再使用 301 重定向到 Public URL
    /*
    if (publicUrl) {
       ...
    }
    */

  } catch (error) {
    console.error('Image Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
