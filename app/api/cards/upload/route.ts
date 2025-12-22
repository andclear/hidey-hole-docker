import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getS3Client } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { parseCharacterCard } from '@/lib/png-parser';
import crypto from 'crypto';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const categoryId = formData.get('categoryId') as string || null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Quick type guard before heavy work
    const allowedTypes = new Set(['image/png', 'application/json']);
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type',
        supported: Array.from(allowedTypes)
      }, { status: 415 });
    }

    // 1. Get raw ArrayBuffer (safe for DataView)
    const rawArrayBuffer = await file.arrayBuffer();
    
    // 2. Create Buffer for Crypto and S3 (Node.js specific)
    const nodeBuffer = Buffer.from(rawArrayBuffer);
    
    // 3. Calculate SHA256 Hash
    const hashSum = crypto.createHash('sha256');
    hashSum.update(nodeBuffer);
    const fileHash = hashSum.digest('hex');

    // 4. Check for duplicates
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('character_cards')
      .select('id')
      .eq('file_hash', fileHash)
      .maybeSingle(); 

    if (existingError) {
       console.error('Check Duplicate Error:', existingError);
    }

    if (existing) {
      return NextResponse.json({ 
        error: 'Duplicate file', 
        code: 'DUPLICATE_HASH',
        cardId: existing.id 
      }, { status: 409 });
    }

    // 5. Parse Metadata
    // Pass the raw ArrayBuffer directly
    const cardData = parseCharacterCard(rawArrayBuffer, file.type);
    if (!cardData) {
      return NextResponse.json({ 
        error: 'Invalid character card format or missing metadata',
        hint: 'Ensure spec is chara_card_v2/v3, or JSON contains the full data fields'
      }, { status: 400 });
    }

    const { name, description, personality, scenario, first_mes, creator_notes, tags: rawTags } = cardData.data;

    // 6. Upload to R2/S3 (Dynamic Client)
    try {
        const { client: s3, bucket } = await getS3Client();
        
        const fileExt = file.name.split('.').pop();
        // Use first 8 chars of hash as folder prefix
        const hashPrefix = fileHash.substring(0, 8);
        const folderName = hashPrefix;
        
        const storagePath = `${folderName}/${fileHash}.${fileExt}`;
        
        // A. Upload Original File
        await s3.send(new PutObjectCommand({
            Bucket: bucket || undefined,
            Key: storagePath,
            Body: nodeBuffer, // PutObject accepts Buffer
            ContentType: file.type,
        }));

        // B. Generate and Upload WebP Thumbnail (Only for PNG)
        let thumbnailPath = null;
        if (fileExt === 'png') {
            try {
                const webpBuffer = await sharp(nodeBuffer)
                    .resize({ width: 400, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80, effort: 4 }) // effort 0-6, higher is slower but better compression
                    .toBuffer();

                thumbnailPath = `${folderName}/small/${fileHash}.webp`;

                await s3.send(new PutObjectCommand({
                    Bucket: bucket || undefined,
                    Key: thumbnailPath,
                    Body: webpBuffer,
                    ContentType: 'image/webp',
                }));
            } catch (sharpError) {
                console.error('Sharp Processing Error:', sharpError);
                // Fallback: If WebP generation fails, use original as thumbnail
                thumbnailPath = storagePath;
            }
        } else {
             // For JSON cards, we don't have image, or maybe use default
             thumbnailPath = null;
        }

        // 7. Insert into Database
        const { data: newCard, error: dbError } = await supabaseAdmin
        .from('character_cards')
        .insert({
            file_hash: fileHash,
            file_name: file.name,
            file_size: file.size,
            file_type: fileExt === 'json' ? 'json' : 'png',
            storage_path: storagePath,
            name: name || 'Untitled',
            description,
            personality,
            scenario,
            first_message: first_mes,
            creator_notes,
            category_id: categoryId,
            thumbnail_path: thumbnailPath || (fileExt !== 'json' ? storagePath : null), 
            data: cardData.data,
            current_version: 1, // Initialize version
        })
        .select()
        .single();

        if (dbError) {
        console.error('DB Insert Error:', dbError);
        throw dbError;
        }

        // 8. Handle Tags
        if (rawTags && rawTags.length > 0) {
        for (const tagName of rawTags) {
            let tagId;
            const { data: existingTag } = await supabaseAdmin
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .maybeSingle();

            if (existingTag) {
            tagId = existingTag.id;
            } else {
            const { data: newTag } = await supabaseAdmin
                .from('tags')
                .insert({ name: tagName })
                .select('id')
                .single();
            tagId = newTag?.id;
            }

            if (tagId) {
            await supabaseAdmin.from('card_tags').insert({
                card_id: newCard.id,
                tag_id: tagId,
                is_manual: true
            });
            }
        }
        }

        return NextResponse.json({ success: true, data: newCard });

    } catch (s3Error: any) {
        console.error('S3 Upload Error:', s3Error);
        return NextResponse.json({ 
            error: 'Failed to upload to storage', 
            details: s3Error.message 
        }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
        error: 'Internal server error',
        details: error.message 
    }, { status: 500 });
  }
}
