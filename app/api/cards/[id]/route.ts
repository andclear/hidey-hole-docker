import { NextRequest, NextResponse } from 'next/server';
import { cardService } from '@/lib/services/card-service';
import { Prisma } from '@prisma/client';

// GET: Fetch Card Details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = await cardService.getCard(id);

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: card });
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
    
    // 允许更新的字段白名单
    const allowedFields = [
      'name', 'description', 'personality', 'scenario', 'first_message', 
      'creator_notes', 'user_notes', 'is_favorite', 'user_rating', 'data',
      'regex_scripts', 'is_nsfw'
    ];
    
    const updates: Prisma.character_cardsUpdateInput = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        // 使用 any 绕过 key 检查，但 logic 保证了安全性
        (updates as any)[field] = body[field];
      }
    });
    
    // 传递 tags 数组 (如果存在)
    await cardService.updateCard(id, updates, body.tags);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Card Update Error:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

// DELETE: Soft Delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await cardService.deleteCard(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Card Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
