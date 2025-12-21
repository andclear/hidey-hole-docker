import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateCardRating } from '@/lib/utils';

// GET: Fetch Card Details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data, error } = await supabaseAdmin
      .from('character_cards')
      .select(`
        *,
        categories (id, name, color),
        card_tags (
          tags (id, name, color)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Flatten tags
    const formattedData = {
      ...data,
      tags: data.card_tags?.map((ct: { tags: unknown }) => ct.tags).filter(Boolean) || []
    };

    // [Consistency Check] Ensure user_rating matches card_reviews
    try {
        const { data: review } = await supabaseAdmin
            .from('card_reviews')
            .select('*')
            .eq('card_id', id)
            .maybeSingle();

        if (review) {
            const calculatedRating = calculateCardRating(review);

            // If mismatch, update DB (Read-Repair)
            // Use loose equality to ignore string vs number difference if values are same (e.g. 4 vs 4.0)
            // But strict on null
            if (formattedData.user_rating !== calculatedRating) {
                console.log(`[Read-Repair] Fixing rating for ${id}: ${formattedData.user_rating} -> ${calculatedRating}`);
                
                await supabaseAdmin
                    .from('character_cards')
                    .update({ user_rating: calculatedRating })
                    .eq('id', id);
                
                // Update local data for response
                formattedData.user_rating = calculatedRating;
            }
        } else if (formattedData.user_rating !== null) {
            // No review but has rating? Reset to null
             console.log(`[Read-Repair] Resetting rating for ${id}: ${formattedData.user_rating} -> null`);
             await supabaseAdmin
                .from('character_cards')
                .update({ user_rating: null })
                .eq('id', id);
             formattedData.user_rating = null;
        }
    } catch (syncError) {
        console.error("Failed to sync rating", syncError);
        // Don't fail the request, just log
    }

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Card Detail Error:', error);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 });
  }
}

// PATCH: Update Card Details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Allowed fields to update
    const allowedFields = [
      'name', 'description', 'personality', 'scenario', 'first_message', 
      'creator_notes', 'user_notes', 'is_favorite', 'user_rating', 'data',
      'regex_scripts', 'is_nsfw'
    ];
    
    const updates: Record<string, unknown> = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });
    
    // Handle Tags Update
    if (body.tags !== undefined && Array.isArray(body.tags)) {
        const newTags: string[] = body.tags;
        
        if (newTags.length > 30) {
            return NextResponse.json({ error: 'Tag limit exceeded (max 30)' }, { status: 400 });
        }

        // 1. Clear existing tags
        await supabaseAdmin.from('card_tags').delete().eq('card_id', id);

        // 2. Insert new tags
        for (const tagName of newTags) {
            if (!tagName.trim()) continue;
            
            // Upsert Tag to get ID (create if not exists)
            const { data: tagData, error: tagError } = await supabaseAdmin
                .from('tags')
                .upsert({ name: tagName }, { onConflict: 'name' })
                .select('id')
                .single();

            if (tagError) {
                console.error('Tag Upsert Error:', tagError);
                continue;
            }

            // Link Tag
            if (tagData?.id) {
                await supabaseAdmin.from('card_tags').insert({
                    card_id: id,
                    tag_id: tagData.id,
                    is_manual: true
                });
            }
        }
    }

    if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error } = await supabaseAdmin
        .from('character_cards')
        .update(updates)
        .eq('id', id);

        if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Card Update Error:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

// DELETE: Soft Delete (Existing)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from('character_cards')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Card Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
