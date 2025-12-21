
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStorageClient } from '@/lib/storage/client';
import { Buffer } from 'buffer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pathPrefix = formData.get('path_prefix') as string || 'chat_history';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Get Storage Settings
    const { data: settingsData } = await supabaseAdmin
      .from('settings')
      .select('*');
    
    const settings: Record<string, any> = {};
    settingsData?.forEach(item => settings[item.key] = item.value);

    // 2. Upload to S3
    const storage = await getStorageClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    
    // Strict file type check
    const allowedExts = ['jsonl', 'txt'];
    if (!fileExt || !allowedExts.includes(fileExt)) {
        return NextResponse.json({ error: 'Only .jsonl and .txt files are allowed' }, { status: 400 });
    }

    // Get card details to construct path
    const { data: card } = await supabaseAdmin
        .from('character_cards')
        .select('file_hash')
        .eq('id', id)
        .single();
    
    if (!card || !card.file_hash) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const hashPrefix = card.file_hash.substring(0, 8);
    const s3Key = `${hashPrefix}/chat_history/${fileName}`;

    await storage.upload(s3Key, buffer, file.type || 'application/json');

    // 3. Record in DB (if it's a chat session)
    if (pathPrefix === 'chat_history') {
        // Calculate basic stats (rough estimate)
        const content = buffer.toString('utf-8');
        const lineCount = content.split('\n').filter(line => line.trim()).length;

        await supabaseAdmin.from('chat_sessions').insert({
            card_id: id,
            file_name: fileName,
            s3_key: s3Key,
            file_size: file.size,
            message_count: lineCount
        });
    }

    return NextResponse.json({ success: true, key: s3Key });

  } catch (error: any) {
    console.error('Upload S3 Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
