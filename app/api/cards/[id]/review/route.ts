import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateCardRating } from '@/lib/utils';

// GET: Fetch Review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('card_reviews')
      .select('*')
      .eq('card_id', id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Fetch Review Error:', error);
    return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 });
  }
}

// POST: Upsert Review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const reviewData = {
      card_id: id,
      rating_plot: Number(body.rating_plot) || 0,
      rating_logic: Number(body.rating_logic) || 0,
      rating_worldview: Number(body.rating_worldview) || 0,
      rating_formatting: Number(body.rating_formatting) || 0,
      rating_playability: Number(body.rating_playability) || 0,
      rating_human: Number(body.rating_human) || 0,
      rating_first_message: Number(body.rating_first_message) || 0,
      mood: body.mood,
      best_model: body.best_model,
      best_preset: body.best_preset,
      notes: body.notes,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('card_reviews')
      .upsert(reviewData, { onConflict: 'card_id' })
      .select()
      .single();

    if (error) throw error;

    // Update card's average rating (simplified for now, just storing user_rating if we want to cache it on the card table)
    // Calculate average
    const avgRating = calculateCardRating(reviewData);

    // Update the main card table with this rating for sorting/display in grid
    await supabaseAdmin
      .from('character_cards')
      .update({ user_rating: avgRating })
      .eq('id', id);

    return NextResponse.json({ success: true, data: { ...data, new_total_rating: avgRating } });
  } catch (error) {
    console.error('Upsert Review Error:', error);
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}

// DELETE: Delete Review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from('card_reviews')
      .delete()
      .eq('card_id', id);

    if (error) throw error;

    // Reset card rating
    await supabaseAdmin
      .from('character_cards')
      .update({ user_rating: null })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Review Error:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
