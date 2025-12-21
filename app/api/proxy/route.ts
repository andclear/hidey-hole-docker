
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Upstream error: ${response.status}`);
    }
    
    const content = await response.text();
    
    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/plain',
        }
    });
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 });
  }
}
