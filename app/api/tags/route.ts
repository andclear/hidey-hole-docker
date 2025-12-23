import { NextResponse } from 'next/server';
import { tagService } from '@/lib/services/tag-service';

export async function GET() {
  try {
    const data = await tagService.getTags();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Tags List Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
