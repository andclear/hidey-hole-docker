import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Empty Trash
export async function DELETE() {
  try {
    // 1. Get all deleted cards to delete files from S3 (Optional - if we want to clean S3 immediately)
    // For now, let's just delete DB records. S3 cleanup can be a scheduled task or separate tool.
    
    // 2. Delete permanently
    const { error } = await supabaseAdmin
      .from('character_cards')
      .delete()
      .eq('is_deleted', true);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Trash Empty API Error:', error);
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 });
  }
}

// Restore All
export async function POST() {
  try {
    const { error } = await supabaseAdmin
      .from('character_cards')
      .update({ is_deleted: false, deleted_at: null })
      .eq('is_deleted', true);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Trash Restore All API Error:', error);
    return NextResponse.json({ error: 'Failed to restore all' }, { status: 500 });
  }
}
