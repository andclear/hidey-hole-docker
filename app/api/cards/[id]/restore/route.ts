import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Restore
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from('character_cards')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Card Restore Error:', error);
    return NextResponse.json({ error: 'Failed to restore card' }, { status: 500 });
  }
}
