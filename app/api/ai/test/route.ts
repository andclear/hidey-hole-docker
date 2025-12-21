import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_url, api_key, model } = body;

    if (!base_url) {
        return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });
    }

    // Simple test: list models
    let url = base_url.replace(/\/$/, "");
    if (!url.endsWith("/models")) {
        url = `${url}/models`;
    }

    const start = Date.now();
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json'
        }
    });
    const latency = Date.now() - start;

    if (!res.ok) {
        return NextResponse.json({ success: false, latency, status: res.status });
    }

    return NextResponse.json({ success: true, latency, status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
