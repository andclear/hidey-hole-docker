import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE: Remove Session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get card_id before deleting to update stats if needed (optional, maybe not decrement play_count to keep history "count" accurate even if detail deleted? Up to design. Let's just delete.)
    
    const { error } = await supabaseAdmin
      .from('play_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
