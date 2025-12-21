import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Total Cards
    const { count: totalCards, error: err1 } = await supabaseAdmin
      .from('character_cards')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    // 2. New this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: newThisMonth, error: err2 } = await supabaseAdmin
      .from('character_cards')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .gte('created_at', startOfMonth.toISOString());

    // 3. Collections Count
    const { count: collectionCount, error: err3 } = await supabaseAdmin
      .from('collections')
      .select('*', { count: 'exact', head: true });

    // 4. Smart Collections (assuming is_smart field)
    const { count: smartCollectionCount, error: err4 } = await supabaseAdmin
      .from('collections')
      .select('*', { count: 'exact', head: true })
      .eq('is_smart', true);

    // 5. Total Tags
    const { count: totalTags, error: err5 } = await supabaseAdmin
      .from('tags')
      .select('*', { count: 'exact', head: true });

    // 6. AI Generated Tags
    const { count: aiTags, error: err6 } = await supabaseAdmin
      .from('tags')
      .select('*', { count: 'exact', head: true })
      .eq('is_ai_generated', true);

    // 7. Play Sessions (This week)
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const { count: sessionsThisWeek, error: err7 } = await supabaseAdmin
      .from('play_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('played_at', startOfWeek.toISOString());
      
    const { count: totalSessions, error: err8 } = await supabaseAdmin
        .from('play_sessions')
        .select('*', { count: 'exact', head: true });

    if (err1 || err2 || err3 || err4 || err5 || err6 || err7) {
      console.error('Stats Error:', { err1, err2, err3, err4, err5, err6, err7 });
    }

    return NextResponse.json({
      success: true,
      data: {
        cards: {
          total: totalCards || 0,
          new_month: newThisMonth || 0
        },
        collections: {
          total: collectionCount || 0,
          smart: smartCollectionCount || 0
        },
        tags: {
          total: totalTags || 0,
          ai_generated: aiTags || 0
        },
        sessions: {
          total: totalSessions || 0,
          week: sessionsThisWeek || 0
        }
      }
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
