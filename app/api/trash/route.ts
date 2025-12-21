import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('character_cards')
      .select('id, name, description, deleted_at, file_size')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Trash List API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch trash items' }, { status: 500 });
  }
}
