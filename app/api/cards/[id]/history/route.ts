import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch history from card_history table
    const { data: history, error } = await supabaseAdmin
      .from('card_history')
      .select('*')
      .eq('card_id', id)
      .order('version_number', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: history });

  } catch (error: any) {
    console.error('History API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
