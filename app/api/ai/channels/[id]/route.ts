import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // If setting as active, disable others first
    if (body.is_active === true) {
        await supabaseAdmin.from('ai_channels').update({ is_active: false }).neq('id', id);
    }

    const { data, error } = await supabaseAdmin
      .from('ai_channels')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('AI Channel Update Error:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from('ai_channels')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('AI Channel Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
  }
}
