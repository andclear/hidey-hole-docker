
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch from source: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": contentType,
            // Optionally add cache headers
        }
    });

  } catch (error: any) {
    console.error("Proxy Download Error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
