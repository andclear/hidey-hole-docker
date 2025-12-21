import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getS3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Get card storage path from DB
    const { data: card, error } = await supabaseAdmin
      .from('character_cards')
      .select('storage_path, file_name')
      .eq('id', id)
      .single();

    if (error || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // 2. Generate Download URL (Presigned)
    const { client: s3, bucket } = await getS3Client();
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: card.storage_path,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(card.file_name)}"`
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes

    // 3. Redirect to S3 URL
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Download Error:', error);
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
  }
}
