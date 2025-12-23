import { NextRequest, NextResponse } from 'next/server';
import { cardService, CardSortOption, SortOrder } from '@/lib/services/card-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const q = searchParams.get('q') || '';
    const sort = (searchParams.get('sort') || 'created_at') as CardSortOption;
    const order = (searchParams.get('order') || 'desc') as SortOrder;
    const categoryId = searchParams.get('category_id') || searchParams.get('category') || undefined;
    const tag = searchParams.get('tag') || undefined;

    const result = await cardService.getCards({
        page,
        limit,
        q,
        sort,
        order,
        categoryId,
        tag
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta
    });

  } catch (error) {
    console.error('Cards List API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
