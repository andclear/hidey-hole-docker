
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/s3";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  const supabase = supabaseAdmin;

  // 1. Get session info to find S3 key
  const { data: session, error: fetchError } = await supabase
    .from("chat_sessions")
    .select("s3_key, card_id")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // 2. Verify card ownership
  if (session.card_id !== id) {
     return NextResponse.json({ error: "Session does not belong to this card" }, { status: 403 });
  }

  // 3. Delete from S3
  try {
    if (session.s3_key) {
      await deleteFile(session.s3_key);
    }
  } catch (e) {
    console.error("S3 Delete Error:", e);
  }

  // 4. Delete from Database
  const { error: deleteError } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  const supabase = supabaseAdmin;
  const body = await request.json();

  if (!body.file_name) {
    return NextResponse.json({ error: "File name is required" }, { status: 400 });
  }

  // Verify ownership
  const { data: session, error: fetchError } = await supabase
    .from("chat_sessions")
    .select("card_id")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.card_id !== id) {
    return NextResponse.json({ error: "Session does not belong to this card" }, { status: 403 });
  }

  // Update
  const { error: updateError } = await supabase
    .from("chat_sessions")
    .update({ file_name: body.file_name })
    .eq("id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
