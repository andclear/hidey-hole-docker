
"use client";

import { useSearchParams } from "next/navigation";
import { ChatViewer } from "@/components/cards/chat-viewer";
import { ModeToggle } from "@/components/mode-toggle";

export function ChatViewerPageClient() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const cardId = searchParams.get("cardId");
  const cardName = searchParams.get("cardName");
  const sessionId = searchParams.get("sessionId");

  if (!url || !cardId) {
    return <div className="p-4">无效的查看链接</div>;
  }

  return (
    <div className="h-screen w-full bg-background">
      <div className="h-full flex flex-col max-w-4xl mx-auto p-4">
        <div className="mb-4 flex items-center justify-between border-b pb-4">
             <div className="flex items-center gap-2">
                 <h1 className="text-xl font-bold">{cardName || "聊天记录预览"}</h1>
                 <span className="text-sm text-muted-foreground">预览模式</span>
             </div>
             <ModeToggle />
        </div>
        <div className="flex-1 overflow-hidden rounded-lg border bg-card">
           <ChatViewer url={url} cardId={cardId} cardName={cardName || ""} sessionId={sessionId || undefined} />
        </div>
      </div>
    </div>
  );
}
