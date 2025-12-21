
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { getS3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: NextRequest) {
  try {
    const { card_ids } = await request.json();

    if (!card_ids || !Array.isArray(card_ids) || card_ids.length === 0) {
      return NextResponse.json({ error: "Invalid card_ids" }, { status: 400 });
    }

    // Fetch card details (storage_path and file_name)
    const { data: cards, error } = await supabaseAdmin
      .from('character_cards')
      .select('id, file_name, storage_path')
      .in('id', card_ids);

    if (error || !cards) {
      return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
    }

    // Initialize S3 client using the helper
    const { client: s3, bucket } = await getS3Client();

    // Generate Presigned URLs for each file
    const urls = await Promise.all(cards.map(async (card) => {
        if (!card.storage_path) return null;

        // If it's already a full URL (e.g. external link), return it directly
        if (card.storage_path.startsWith("http")) {
            return {
                name: card.file_name || `card_${card.id}.png`,
                url: card.storage_path
            };
        }

        // Generate S3 presigned URL
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: card.storage_path,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // Valid for 1 hour

        return {
            name: card.file_name || `card_${card.id}.png`,
            url: url
        };
    }));

    // Filter out nulls
    const validUrls = urls.filter(u => u !== null);

    return NextResponse.json({ success: true, urls: validUrls });

  } catch (error: any) {
    console.error("Batch Download Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
