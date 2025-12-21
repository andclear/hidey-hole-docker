
"use client";

import { useEffect, useState } from "react";
import { ChatViewer } from "@/components/cards/chat-viewer";
import { ModeToggle } from "@/components/mode-toggle";
import { Loader2 } from "lucide-react";

interface SharePageClientProps {
  token: string;
  initialSession: any;
  cardName: string;
  cardId: string;
}

export function SharePageClient({ token, initialSession, cardName, cardId }: SharePageClientProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Get presigned URL for the shared file
    const fetchUrl = async () => {
      try {
        const res = await fetch(`/api/storage/presign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: initialSession.s3_key })
        });
        const data = await res.json();
        if (data.success) {
            setFileUrl(data.url);
        } else {
            setError("无法加载文件");
        }
      } catch (e) {
          setError("网络错误");
      }
    };
    fetchUrl();
  }, [initialSession.s3_key]);

  if (error) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-background text-destructive">
              {error}
          </div>
      );
  }

  if (!fileUrl) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  return (
    <div className="h-screen w-full bg-background">
      <div className="h-full flex flex-col max-w-4xl mx-auto p-4">
        <div className="mb-4 flex items-center justify-between border-b pb-4">
             <div className="flex items-center gap-2">
                 <h1 className="text-xl font-bold">{cardName}</h1>
                 <span className="text-sm text-muted-foreground">· {initialSession.file_name}</span>
             </div>
             <ModeToggle />
        </div>
        <div className="flex-1 overflow-hidden rounded-lg border bg-card">
           <ChatViewer url={fileUrl} cardId={cardId} cardName={cardName} />
        </div>
      </div>
    </div>
  );
}
