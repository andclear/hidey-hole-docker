import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  const body = await request.json();
  const page = body.page;

  if (!page || typeof page !== 'number') {
    return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
  }

  // Update progress
  const { error } = await supabaseAdmin
    .from("chat_sessions")
    .update({ last_read_page: page })
    .eq("id", sessionId)
    .eq("card_id", id); // Extra safety check

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;

  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("last_read_page")
    .eq("id", sessionId)
    .eq("card_id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, page: data.last_read_page || 1 });
}
