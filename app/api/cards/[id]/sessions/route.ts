import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Fetch Sessions for a Card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data, error } = await supabaseAdmin
      .from('play_sessions')
      .select('*')
      .eq('card_id', id)
      .order('played_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Session List Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST: Add New Session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 1. Insert session
    const { data, error } = await supabaseAdmin
      .from('play_sessions')
      .insert({
        card_id: id,
        played_at: body.played_at || new Date().toISOString(),
        duration_minutes: body.duration_minutes || 0,
        model_used: body.model_used,
        api_provider: body.api_provider,
        rating: body.rating,
        mood: body.mood,
        notes: body.notes
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Update Card Stats (Manual increment)
    // Fetch current count first to be safe
    const { data: card } = await supabaseAdmin
      .from('character_cards')
      .select('play_count')
      .eq('id', id)
      .single();

    const newCount = (card?.play_count || 0) + 1;

    await supabaseAdmin
      .from('character_cards')
      .update({ 
        play_count: newCount,
        last_played_at: new Date().toISOString()
      })
      .eq('id', id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Session Add Error:', error);
    return NextResponse.json({ error: 'Failed to add session' }, { status: 500 });
  }
}
