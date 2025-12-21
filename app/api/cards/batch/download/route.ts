import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getS3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { card_ids } = body;

    if (!Array.isArray(card_ids) || card_ids.length === 0) {
        return NextResponse.json({ error: 'No cards selected' }, { status: 400 });
    }

    // 1. Fetch Cards
    const { data: cards, error } = await supabaseAdmin
        .from('character_cards')
        .select('id, name, storage_path, file_type')
        .in('id', card_ids);

    if (error || !cards) {
        return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
    }

    const { client, bucket } = await getS3Client();

    // 2. Prepare Archive
    const archive = archiver('zip', { zlib: { level: 5 } });
    const passthrough = new PassThrough();
    
    archive.pipe(passthrough);

    // 3. Background Processing
    (async () => {
        try {
            for (const card of cards) {
                try {
                    if (!card.storage_path) continue;
                    
                    const command = new GetObjectCommand({
                        Bucket: bucket,
                        Key: card.storage_path
                    });
                    
                    const response = await client.send(command);
                    const stream = response.Body as NodeJS.ReadableStream;
                    
                    if (stream) {
                        let filename = card.name;
                        // Sanitize filename
                        filename = filename.replace(/[\/\\:*?"<>|]/g, '_');
                        // Add extension if missing
                        if (card.file_type && !filename.toLowerCase().endsWith(`.${card.file_type.toLowerCase()}`)) {
                            filename += `.${card.file_type}`;
                        } else if (!filename.includes('.')) {
                            filename += '.png'; // Default
                        }
                        
                        archive.append(stream, { name: filename });
                    }
                } catch (e) {
                    console.error(`Failed to download ${card.name}`, e);
                    archive.append(Buffer.from(`Failed to download: ${e}`), { name: `ERROR_${card.name}.txt` });
                }
            }
        } catch (err) {
            console.error("Archive generation error", err);
        } finally {
            archive.finalize();
        }
    })();

    // 4. Return Stream
    const webStream = new ReadableStream({
        start(controller) {
            passthrough.on('data', (chunk) => controller.enqueue(chunk));
            passthrough.on('end', () => controller.close());
            passthrough.on('error', (err) => controller.error(err));
        }
    });

    return new NextResponse(webStream, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="cards_batch_${Date.now()}.zip"`
        }
    });

  } catch (error: any) {
    console.error('Batch Download Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
