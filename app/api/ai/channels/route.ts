import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_channels')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('AI Channels List Error:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, base_url, api_key, model, is_active } = body;

    // Validate
    if (!name || !base_url) {
        return NextResponse.json({ error: 'Name and Base URL are required' }, { status: 400 });
    }

    // If setting as active, disable others
    if (is_active) {
        await supabaseAdmin.from('ai_channels').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await supabaseAdmin
      .from('ai_channels')
      .insert({
        name, 
        base_url, 
        api_key, 
        model, 
        is_active: is_active || false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('AI Channel Create Error:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
  }
}
