import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getS3Client } from '@/lib/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

// Permanent Delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Get storage path before deleting
    const { data: card, error: fetchError } = await supabaseAdmin
      .from('character_cards')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError) {
        // If card not found, maybe already deleted, just return success
        console.warn("Card not found for deletion:", id);
    }

    if (card?.storage_path) {
        // 2. Delete from S3
        try {
            const { client: s3, bucket } = await getS3Client();
            await s3.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: card.storage_path
            }));
        } catch (s3Error) {
            console.error("Failed to delete from S3:", s3Error);
            // Continue to delete from DB even if S3 fails, to avoid zombie records
        }
    }
    
    // 3. Delete from DB
    const { error } = await supabaseAdmin
      .from('character_cards')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Card Permanent Delete Error:', error);
    return NextResponse.json({ error: 'Failed to permanently delete card' }, { status: 500 });
  }
}
