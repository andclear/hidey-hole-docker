import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, target_lang = "Simplified Chinese" } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // 1. Get Active AI Channel
    const { data: channel, error: channelError } = await supabaseAdmin
      .from('ai_channels')
      .select('*')
      .eq('is_active', true)
      .single();

    if (channelError || !channel) {
      return NextResponse.json({ 
        error: 'No active AI channel configured', 
        code: 'NO_AI_CHANNEL' 
      }, { status: 404 });
    }

    // 2. Construct Prompt
    const prompt = `You are a professional translator for creative writing and RPG settings. Translate the following text into ${target_lang}. Maintain the tone, style, and specific terminology. Only output the translation, no explanations.\n\nText:\n${text}`;

    // 3. Call AI API (OpenAI Compatible)
    const payload = {
      model: channel.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful translator.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    };

    let url = channel.base_url.replace(/\/$/, "");
    if (!url.endsWith("/chat/completions")) {
        // Simple heuristic to append endpoint if missing
        if (url.endsWith("/v1")) {
            url = `${url}/chat/completions`;
        } else {
             // If base_url is just host, append v1/chat/completions? Or assume user provided full path?
             // Usually users provide base_url like https://api.openai.com/v1
             url = `${url}/chat/completions`;
        }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channel.api_key}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error('AI API Error:', errText);
        return NextResponse.json({ error: `AI Provider Error: ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    const translatedText = json.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
        return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 });
    }

    return NextResponse.json({ 
        success: true, 
        data: translatedText,
        prompt: prompt // Return prompt as requested
    });

  } catch (error: any) {
    console.error('Translation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
