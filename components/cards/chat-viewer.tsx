
"use client";

import { useEffect, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Loader2, Share2, Copy, Check } from "lucide-react";
import { MessageCard, ChatMessageData } from "./message-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatViewerProps {
  url: string;
  cardName: string;
  cardId?: string;
  sessionId?: string; // Optional session ID for sharing
}

interface RegexScript {
  id: string;
  regex?: string; // Global setting format
  replace?: string;
  flags?: string;
  
  // Card specific format compatibility
  scriptName?: string;
  findRegex?: string; // Card format: "/pattern/flags" or just pattern
  replaceString?: string;
  placement?: number[];
  disabled?: boolean;
}

// Web Worker (off-main-thread) to process chat content
function createChatWorker() {
  const worker = new Worker(new URL("./workers/chat-processing.worker.ts", import.meta.url), { type: "module" });
  return worker;
}

export function ChatViewer({ url, cardName, cardId, sessionId }: ChatViewerProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [regexPipeline, setRegexPipeline] = useState<RegexScript[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const [versions, setVersions] = useState<Record<number, number>>({});
  
  // Share State
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Check if content is TXT based on first message
  const isTxtFormat = messages.length > 0 && messages[0].is_raw_text;

  const handleShare = async () => {
      if (!cardId || !sessionId) return;
      
      setSharing(true);
      try {
          const res = await fetch(`/api/cards/${cardId}/chat-sessions/${sessionId}/share`, {
              method: "POST"
          });
          const data = await res.json();
          
          if (data.success && data.token) {
              const fullUrl = `${window.location.origin}/share/${data.token}`;
              setShareUrl(fullUrl);
          } else {
              toast.error(data.error || "创建分享链接失败");
          }
      } catch (e) {
          toast.error("网络错误");
      } finally {
          setSharing(false);
      }
  };

  const copyToClipboard = () => {
      if (!shareUrl) return;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("链接已复制");
  };

  // Fetch Regex Rules
  useEffect(() => {
    const fetchRegexRules = async () => {
       try {
         // 1. Fetch Global Settings
         const settingsRes = await fetch("/api/settings");
         const settingsData = await settingsRes.json();
         const globalRules = (settingsData.data?.global_regex || []) as RegexScript[];

         let cardRules: RegexScript[] = [];
         // 2. Fetch Card Rules if cardId exists
         if (cardId) {
            const cardRes = await fetch(`/api/cards/${cardId}`);
            const cardData = await cardRes.json();
            
            if (cardData.success && cardData.data) {
                const builtInRules = cardData.data.data?.extensions?.regex_scripts || [];
                const displayRules = cardData.data.regex_scripts || [];
                cardRules = [...builtInRules, ...displayRules];
            }
         }

         setRegexPipeline([...globalRules, ...cardRules]);
       } catch (e) {
         console.error("Failed to load regex rules", e);
       }
    };
    
    fetchRegexRules();
  }, [cardId]);

  useEffect(() => {
    if (url) {
        fetchChatContent();
    }
  }, [url, regexPipeline]);

  // Listen for iframe height updates and trigger per-item re-measure
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const name: string | undefined = event?.data?.iframe_name;
      if (event?.data?.type === 'TH_ADJUST_IFRAME_HEIGHT' && name) {
        const m = name.match(/msg\-(\d+)\-part\-\d+|msg\-(\d+)\-inline\-html/);
        const idxStr = m?.[1] ?? m?.[2];
        if (idxStr) {
          const idx = parseInt(idxStr, 10);
          setVersions(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const fetchChatContent = async () => {
    try {
      setLoading(true);
      
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      
      if (!res.ok) throw new Error("无法加载聊天记录文件");
      
      const text = await res.text();
      // Initialize worker if needed
      if (!workerRef.current) {
        workerRef.current = createChatWorker();
        workerRef.current.onmessage = (evt: MessageEvent<{ messages: ChatMessageData[] }>) => {
          const { messages: processed } = evt.data;
          setMessages(processed);
          setLoading(false);
        };
      }
      // Send to worker for off-main-thread processing
      workerRef.current.postMessage({ text, rules: regexPipeline });
      return; // early return, loading flag will be cleared by worker
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("加载失败: " + msg);
    } finally {
      // worker callback will clear loading; keep as fallback
      // setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>正在从云端加载聊天记录...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px] text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full border rounded-lg bg-background/50 p-4 relative group/viewer">
      {/* Share Button (Only for TXT logs and if session ID exists) */}
      {isTxtFormat && sessionId && (
          <div className="absolute top-4 right-6 z-10 opacity-0 group-hover/viewer:opacity-100 transition-opacity duration-300">
              <Popover>
                  <PopoverTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="shadow-sm gap-2 bg-background/80 backdrop-blur border"
                        onClick={handleShare}
                      >
                          <Share2 className="h-4 w-4" />
                          分享
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="end">
                      <div className="space-y-3">
                          <h4 className="font-medium leading-none">分享聊天记录</h4>
                          <p className="text-xs text-muted-foreground">
                              创建一个公开链接，任何人都可以查看此聊天记录。
                          </p>
                          {shareUrl ? (
                              <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 bg-muted p-2 rounded text-xs truncate font-mono select-all">
                                      {shareUrl}
                                  </div>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyToClipboard}>
                                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                              </div>
                          ) : (
                              <div className="flex justify-center py-2">
                                  {sharing ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
                              </div>
                          )}
                      </div>
                  </PopoverContent>
              </Popover>
          </div>
      )}

      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        data={messages}
        totalCount={messages.length}
        itemContent={(index, msg) => (
          <div className="px-2">
            <MessageCard 
              message={msg} 
              index={index} 
              version={versions[index] || 0}
              onExpand={(i) => {
                requestAnimationFrame(() => {
                  try {
                    virtuosoRef.current?.scrollToIndex(i);
                  } catch {}
                });
              }}
            />
          </div>
        )}
      />
    </div>
  );
}
