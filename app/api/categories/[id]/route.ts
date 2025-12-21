import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Exclude id from body to avoid primary key update error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...updateData } = body;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
        }
        throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Category Update Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Cards will automatically have category_id set to NULL due to ON DELETE SET NULL
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
