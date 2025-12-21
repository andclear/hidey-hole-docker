import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch categories with count
    // Supabase doesn't support count in select easily without foreign key join
    // We can do a join: categories( *, character_cards(count) )
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*, character_cards(count)')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Transform data to flat structure
    const categories = data.map(cat => ({
        ...cat,
        count: cat.character_cards?.[0]?.count || 0
    }));

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Categories List Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, description } = body;

    if (!name) {
        return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ name, color, description })
      .select()
      .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
        }
        throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Category Create Error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
