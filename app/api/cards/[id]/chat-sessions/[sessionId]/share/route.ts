
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from 'nanoid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  const supabase = supabaseAdmin;

  // 1. Verify session exists and belongs to card
  const { data: session, error: fetchError } = await supabase
    .from("chat_sessions")
    .select("file_name, s3_key, card_id")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.card_id !== id) {
    return NextResponse.json({ error: "Session does not belong to this card" }, { status: 403 });
  }

  // 2. Check if file is TXT (Requirement: only TXT can be shared)
  const isTxt = session.file_name.toLowerCase().endsWith('.txt') || session.s3_key?.toLowerCase().endsWith('.txt');
  if (!isTxt) {
      return NextResponse.json({ error: "Only TXT chat logs can be shared" }, { status: 400 });
  }

  // 3. Create or Get Share Link
  // Check if already shared? (Optional, but good practice to reuse)
  const { data: existing } = await supabase
    .from("shared_links")
    .select("token")
    .eq("chat_session_id", sessionId)
    .maybeSingle();

  if (existing) {
      return NextResponse.json({ success: true, token: existing.token });
  }

  // Create new
  const token = nanoid(10); // Short ID
  const { error: createError } = await supabase
    .from("shared_links")
    .insert({
        token,
        chat_session_id: sessionId
    });

  if (createError) {
      return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }

  return NextResponse.json({ success: true, token });
}

// Get share status
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
  ) {
    const { sessionId } = await params;
    const { data } = await supabaseAdmin
        .from("shared_links")
        .select("token")
        .eq("chat_session_id", sessionId)
        .maybeSingle();
    
    return NextResponse.json({ success: true, token: data?.token || null });
  }
