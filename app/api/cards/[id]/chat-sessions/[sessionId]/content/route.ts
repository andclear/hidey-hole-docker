import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // 1. Get session info
  const { data: session, error: fetchError } = await supabaseAdmin
    .from("chat_sessions")
    .select("s3_key, card_id, file_name")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // 2. Fetch File Content from S3 (via Proxy Logic or Direct)
  // Since we don't have direct S3 access here easily without importing S3 client, 
  // let's reuse the public URL if available, or generate a presigned URL.
  // Actually, we should use the internal S3 client to get the stream.
  
  // However, for simplicity and since we already have a proxy mechanism, 
  // we can just fetch the full content and slice it. 
  // BUT the user specifically asked for optimization for large files.
  // So fetching 50MB into memory to slice it is bad.
  
  // We need to stream it.
  // But parsing JSONL/TXT line by line from a stream is complex.
  // Let's implement a basic streaming parser.
  
  try {
      // Generate Presigned URL
      const { getS3Client } = await import('@/lib/s3');
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      
      const { client: s3, bucket } = await getS3Client();
      const command = new GetObjectCommand({
          Bucket: bucket,
          Key: session.s3_key
      });
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      
      const response = await fetch(url);
      if (!response.ok || !response.body) throw new Error("Failed to fetch from S3");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let lineCount = 0;
      let buffer = '';
      const lines: string[] = [];
      const startLine = (page - 1) * limit;
      const endLine = startLine + limit;
      
      // Streaming Parse
      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          
          // Process all complete lines
          for (let i = 0; i < parts.length - 1; i++) {
              const line = parts[i];
              if (line.trim()) {
                  if (lineCount >= startLine && lineCount < endLine) {
                      lines.push(line);
                  }
                  lineCount++;
              }
              // Optimization: If we passed the endLine, can we stop?
              // Only if we don't care about total count.
              // For pagination UI, we usually need total count or at least "hasMore".
              // If we stop early, we don't know total.
              // Let's stop if we have enough lines AND we assume "hasMore" if stream wasn't done.
              
              if (lineCount >= endLine + 1) { // Read one more to check hasMore
                  // We can stop reading stream to save bandwidth?
                  // Yes, cancel reader.
                  await reader.cancel();
                  buffer = ''; // Clear buffer
                  break; 
              }
          }
          
          // Keep the last partial line in buffer
          buffer = parts[parts.length - 1];
          
          if (lineCount >= endLine + 1) break;
      }
      
      // Process remaining buffer if any (and if we didn't cancel early)
      if (buffer.trim() && lineCount < endLine) {
           if (lineCount >= startLine) {
               lines.push(buffer);
           }
           lineCount++;
      }

      // Parse Lines into JSON objects if JSONL, or raw objects if TXT
      const isJsonl = session.file_name.endsWith('.jsonl');
      const parsedData = lines.map(line => {
          try {
              return isJsonl ? JSON.parse(line) : { is_raw_text: true, text: line };
          } catch (e) {
              return { is_raw_text: true, text: line };
          }
      });

      return NextResponse.json({
          success: true,
          data: parsedData,
          meta: {
              page,
              limit,
              hasMore: lineCount > endLine // Heuristic
          }
      });

  } catch (error: any) {
      console.error("Chat Content Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
