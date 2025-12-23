import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/lib/services/chat-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    await chatService.deleteSession(id, sessionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Session Delete Error:", error);
    if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    const body = await request.json();

    if (!body.file_name) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    await chatService.updateSession(id, sessionId, { file_name: body.file_name });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('Not found')) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
