import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/services/chat-service';

// GET: List chat sessions for a card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessions = await chatService.getSessions(id);
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Session List Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
