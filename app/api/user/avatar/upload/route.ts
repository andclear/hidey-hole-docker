
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    // Convert to base64 data URI (simplest for small avatar, stored in DB directly)
    // Assuming avatar is small enough for text field (or we should use bytea but text is easier for now if < 1MB)
    // Wait, storing base64 in DB is not ideal for large images.
    // But user asked to save to DB, NOT S3.
    // So we will store as Data URI in the `avatar_url` column.
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    const mimeType = file.type;
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Update DB
    const { data: existing } = await supabaseAdmin.from('user_settings').select('id').limit(1).single();
    
    let error;
    if (existing) {
        const res = await supabaseAdmin.from('user_settings').update({ avatar_url: dataUri }).eq('id', existing.id);
        error = res.error;
    } else {
        const res = await supabaseAdmin.from('user_settings').insert({ avatar_url: dataUri });
        error = res.error;
    }

    if (error) throw error;

    return NextResponse.json({ success: true, avatar_url: dataUri });
  } catch (error) {
    console.error("Avatar Upload Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
