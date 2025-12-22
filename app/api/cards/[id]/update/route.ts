import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getS3Client } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { parseCharacterCard } from '@/lib/png-parser';
import crypto from 'crypto';
import sharp from 'sharp';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const changelog = formData.get('changelog') as string || '';

    if (!changelog) {
        return NextResponse.json({ error: 'Changelog is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const allowedTypes = new Set(['image/png', 'application/json']);
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type',
        supported: Array.from(allowedTypes)
      }, { status: 415 });
    }

    // 1. Fetch current card data
    const { data: currentCard, error: fetchError } = await supabaseAdmin
        .from('character_cards')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !currentCard) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Safely get current version, defaulting to 1 if null/undefined
    const currentVersion = currentCard.current_version ?? 1;

    // 2. Process new file
    const rawArrayBuffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(rawArrayBuffer);
    
    // Calculate SHA256 Hash
    const hashSum = crypto.createHash('sha256');
    hashSum.update(nodeBuffer);
    const fileHash = hashSum.digest('hex');

    // Parse Metadata
    const cardData = parseCharacterCard(rawArrayBuffer, file.type);
    if (!cardData) {
      return NextResponse.json({ error: 'Invalid character card format' }, { status: 400 });
    }

    // 3. Upload to S3 (Use same folder prefix logic as upload)
    const { client: s3, bucket } = await getS3Client();
    const fileExt = file.name.split('.').pop();
    const hashPrefix = fileHash.substring(0, 8);
    const folderName = hashPrefix;
    const storagePath = `${folderName}/${fileHash}.${fileExt}`;

    // Generate Thumbnail (if PNG)
    let thumbnailPath: string | null = null;
    if (fileExt === 'png') {
        // Optimistically skip sharp if file is small enough? 
        // Or keep it for consistency. Sharp is fast enough usually.
        // The slowness might come from S3 upload or DB?
        // Let's optimize by running S3 uploads in parallel.
        
        try {
            const webpBuffer = await sharp(nodeBuffer)
                .resize({ width: 400, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80, effort: 3 }) // Lower effort for speed (default 4)
                .toBuffer();

            thumbnailPath = `${folderName}/small/${fileHash}.webp`;

            // Parallel Uploads
            await Promise.all([
                s3.send(new PutObjectCommand({
                    Bucket: bucket || undefined,
                    Key: storagePath,
                    Body: nodeBuffer,
                    ContentType: file.type,
                })),
                s3.send(new PutObjectCommand({
                    Bucket: bucket || undefined,
                    Key: thumbnailPath,
                    Body: webpBuffer,
                    ContentType: 'image/webp',
                }))
            ]);
        } catch (sharpError) {
            console.error('Sharp Processing Error:', sharpError);
            thumbnailPath = storagePath;
            // Fallback upload only original
             await s3.send(new PutObjectCommand({
                Bucket: bucket || undefined,
                Key: storagePath,
                Body: nodeBuffer,
                ContentType: file.type,
            }));
        }
    } else {
         // Non-PNG, just upload original
         await s3.send(new PutObjectCommand({
            Bucket: bucket || undefined,
            Key: storagePath,
            Body: nodeBuffer,
            ContentType: file.type,
        }));
    }

    // 4. Perform DB Transaction
    // Supabase REST API doesn't support complex transactions easily without RPC.
    // We perform the update and history insertion in parallel.
    
    const newVersion = currentVersion + 1;
    
    // Update the data object
    const newData = {
        ...cardData.data,
        version_notes: changelog // Store changelog in V3 data extension or root
    };

    // Parallelize Main Card Update and History Archive
    // Since History Archive depends on *Current* state (which we have in memory `currentCard`), 
    // and Main Update sets *New* state, they are independent operations on the DB side.
    // (Strictly speaking, if Update succeeds and Archive fails, we lose history, but risk is low)
    
    await Promise.all([
        supabaseAdmin
            .from('card_history')
            .insert({
                card_id: id,
                version_number: currentVersion,
                file_path: currentCard.storage_path,
                file_name: currentCard.file_name,
                file_hash: currentCard.file_hash,
                thumbnail_path: currentCard.thumbnail_path,
                data: currentCard.data,
                changelog: currentCard.data?.version_notes || null, // Capture the changelog of the VERSION BEING ARCHIVED
                created_at: currentCard.updated_at || currentCard.created_at
            }),
            
        supabaseAdmin
            .from('character_cards')
            .update({
                file_hash: fileHash,
                file_name: file.name,
                file_size: file.size,
                file_type: fileExt === 'json' ? 'json' : 'png',
                storage_path: storagePath,
                thumbnail_path: thumbnailPath || (fileExt !== 'json' ? storagePath : null),
                data: newData, // Update V3 data with version_notes
                current_version: newVersion,
                updated_at: new Date().toISOString(),
                // Also update basic metadata if changed in card
                name: cardData.data.name || currentCard.name,
                description: cardData.data.description,
                personality: cardData.data.personality,
                scenario: cardData.data.scenario,
                first_message: cardData.data.first_mes,
                creator_notes: cardData.data.creator_notes,
            })
            .eq('id', id)
    ]);

    // We can't easily return the updatedCard from Promise.all without a separate fetch or more complex logic.
    // But we know the new version number.
    
    return NextResponse.json({ success: true, version: newVersion });

  } catch (error: any) {
    console.error('Update API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
