import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // We need to count tags.
    // Tags are stored in a many-to-many relationship via card_tags table.
    // We want to list all tags and their usage count.
    
    // Step 1: Get all tags
    const { data: tags, error } = await supabaseAdmin
      .from('tags')
      .select('id, name');

    if (error) throw error;

    // Step 2: Get counts from card_tags
    // Since we can't easily do a group by count in a single simple query via client sometimes,
    // we can use rpc if defined, or just fetch all card_tags and aggregate in memory (not efficient for huge data but fine for personal use).
    // Or better: .select('tag_id, count', { count: 'exact' }) ... wait, group by support is limited in JS client.
    
    // Let's try to get all card_tags to count.
    const { data: cardTags, error: ctError } = await supabaseAdmin
        .from('card_tags')
        .select('tag_id');
        
    if (ctError) throw ctError;
    
    // Aggregate
    const counts: Record<string, number> = {};
    cardTags.forEach((ct: { tag_id: string }) => {
        counts[ct.tag_id] = (counts[ct.tag_id] || 0) + 1;
    });
    
    // Merge
    const result = tags.map(t => ({
        name: t.name,
        count: counts[t.id] || 0
    })).filter(t => t.count > 0).sort((a, b) => b.count - a.count); // Only show used tags, sorted by count

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Tags List Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
