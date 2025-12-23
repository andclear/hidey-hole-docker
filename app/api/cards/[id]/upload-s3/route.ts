import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/services/chat-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    
    // 严格文件类型检查
    const allowedExts = ['jsonl', 'txt'];
    if (!fileExt || !allowedExts.includes(fileExt)) {
        return NextResponse.json({ error: 'Only .jsonl and .txt files are allowed' }, { status: 400 });
    }

    const session = await chatService.uploadSession(id, file, fileName);

    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Upload Error:', error);
    if (error.message === 'Card not found') {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
