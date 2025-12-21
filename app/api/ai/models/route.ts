import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_url, api_key } = body;

    if (!base_url) {
        return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });
    }

    // Ensure URL ends with /v1/models or just use base_url if it already has it?
    // Standard OpenAI: base_url + /models (if base_url includes /v1)
    // Or base_url + /v1/models if it doesn't?
    // Let's try to be smart.
    let url = base_url.replace(/\/$/, "");
    if (!url.endsWith("/models")) {
        // If it doesn't end with models, append it.
        // If it doesn't end with v1, maybe append v1?
        // Usually user provides "https://api.openai.com/v1"
        url = `${url}/models`;
    }

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Fetch failed: ${res.status} ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data || [] });
  } catch (error: any) {
    console.error('AI Models Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
