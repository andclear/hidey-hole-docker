import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateCardRating } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const q = searchParams.get('q') || '';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const categoryId = searchParams.get('category_id') || searchParams.get('category');
    const tag = searchParams.get('tag');

    const offset = (page - 1) * limit;

    // Base query setup
    let selectQuery = `
        *,
        categories (id, name, color),
        card_reviews (
            rating_plot,
            rating_logic,
            rating_worldview,
            rating_formatting,
            rating_playability,
            rating_human,
            rating_first_message
        )
    `;

    // If filtering by tag, we need inner join to enforce the filter
    if (tag) {
        selectQuery += `,
        card_tags!inner (
          tags!inner (id, name, color)
        )`;
    } else {
        // Otherwise use left join (default) to get tags even if we don't filter by them
        // Note: In standard Supabase select, just specifying nested resource implies left join usually,
        // unless !inner is used.
        selectQuery += `,
        card_tags (
          tags (id, name, color)
        )`;
    }

    let query = supabaseAdmin
      .from('character_cards')
      .select(selectQuery, { count: 'exact' })
      .eq('is_deleted', false); // Only show non-deleted cards

    // Filter by Tag
    if (tag) {
         query = query.eq('card_tags.tags.name', tag);
    }

    // Filter by Search Query
    if (q) {
      // Escape special characters in q to prevent syntax errors in PostgREST
      const sanitizedQ = q.replace(/[(),]/g, ''); 
      if (sanitizedQ.trim()) {
          query = query.or(`name.ilike.%${sanitizedQ}%,description.ilike.%${sanitizedQ}%,ai_summary.ilike.%${sanitizedQ}%,user_notes.ilike.%${sanitizedQ}%,creator_notes.ilike.%${sanitizedQ}%`);
      }
    }

    // Filter by Category
    if (categoryId) {
      if (categoryId === 'null' || categoryId === 'uncategorized') {
         query = query.is('category_id', null);
      } else {
         query = query.eq('category_id', categoryId);
      }
    }

    // Sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Cards API Error:', error);
      throw error;
    }

    // Transform data to cleaner structure if needed
    const flattenedData = data?.map((card: any) => {
        // Calculate dynamic rating from review data if available
        // Note: card_reviews is an array because of the join, but we know it's 1:1 or 1:0
        const review = Array.isArray(card.card_reviews) ? card.card_reviews[0] : card.card_reviews;
        const dynamicRating = calculateCardRating(review);

        return {
            ...card,
            // Override stored user_rating with dynamically calculated one for display consistency
            user_rating: dynamicRating !== null ? dynamicRating : card.user_rating,
            tags: card.card_tags?.map((ct: any) => ct.tags).filter(Boolean) || [],
            // Remove review data from response to keep it clean (optional)
            card_reviews: undefined
        };
    });

    return NextResponse.json({
      success: true,
      data: flattenedData,
      meta: {
        total: count,
        page,
        limit,
        hasMore: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('Cards List API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
