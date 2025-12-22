
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

declare global {
  interface Window {
    chatContentCache: Record<string, string>;
  }
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

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  
  // Cache for preloaded pages
  const preloadedPages = useRef<Record<number, ChatMessageData[]>>({});

  const LIMIT = 20;

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

  // Load progress and content on mount
  useEffect(() => {
      if (!cardId || !sessionId) {
          if (url) {
             // Preview mode (no session ID), just load page 1
             fetchChatContent(1);
          }
          return;
      }
      
      const init = async () => {
          try {
              // 1. Get Progress
              const res = await fetch(`/api/cards/${cardId}/chat-sessions/${sessionId}/progress`);
              const data = await res.json();
              const savedPage = data.success ? data.page : 1;
              setPage(savedPage);
              
              // 2. Load Content for saved page
              await fetchChatContent(savedPage);
              setInitialLoaded(true);
          } catch (e) {
              // Fallback
              fetchChatContent(1);
          }
      };
      
      init();
  }, [cardId, sessionId, url, regexPipeline]); // Include regexPipeline to trigger re-process if rules change? No, handled inside fetch.

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

  const fetchChatContent = async (pageNum: number) => {
    try {
      setLoading(true);
      setError("");
      
      // Load ALL content from proxy if not already loaded (caching mechanism)
      // Since we switched to client-side pagination, we need the FULL content first.
      // But re-fetching 50MB every page change is bad.
      // We should fetch once, store in a ref or state, and then paginate locally.
      
      // Check if we have full raw text cached
      if (!window.chatContentCache) {
          window.chatContentCache = {};
      }
      
      let rawText = window.chatContentCache[url];
      
      if (!rawText) {
          const fetchUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error("无法加载聊天记录文件");
          rawText = await res.text();
          try {
             // Try to cache in sessionStorage if small enough, or just memory
             window.chatContentCache[url] = rawText;
          } catch {}
      }

      // Initialize worker if needed
      if (!workerRef.current) {
        workerRef.current = createChatWorker();
        workerRef.current.onmessage = (evt: MessageEvent<{ messages: ChatMessageData[]; total: number; preload?: Record<number, ChatMessageData[]> }>) => {
          const { messages: processed, total, preload } = evt.data;
          
          setMessages(processed);
          setTotalCount(total);
          
          // Store preloaded pages
          if (preload) {
              Object.entries(preload).forEach(([p, msgs]) => {
                  preloadedPages.current[parseInt(p)] = msgs;
              });
          }
          
          // Calculate if has more
          const currentCount = (pageNum - 1) * LIMIT + processed.length;
          setHasMore(currentCount < total);
          
          setLoading(false);
          // Scroll to top when page changes
          virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start' });
        };
      }

      // Check cache first!
      if (preloadedPages.current[pageNum]) {
          console.log(`Using cached data for page ${pageNum}`);
          setMessages(preloadedPages.current[pageNum]);
          setLoading(false);
          virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start' });
          
          // Still ask worker to preload NEXT pages if not cached?
          // For simplicity, we can just trigger worker again to preload next ones if needed.
          // But to be super fast, we skip worker if we have data.
          // However, we need to ensure we keep preloading ahead.
          // Let's fire-and-forget worker to preload next pages.
          workerRef.current.postMessage({ 
              text: rawText, 
              rules: regexPipeline,
              page: pageNum,
              limit: LIMIT
          });
          return;
      }

      // Send to worker with pagination params
      workerRef.current.postMessage({ 
          text: rawText, 
          rules: regexPipeline,
          page: pageNum,
          limit: LIMIT
      });
      
      return; 
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("加载失败: " + msg);
      setLoading(false);
    }
  };

  const changePage = async (newPage: number) => {
      if (newPage < 1) return;
      
      // Calculate max page if totalCount is known
      if (totalCount > 0) {
          const maxPage = Math.ceil(totalCount / LIMIT);
          if (newPage > maxPage) return;
      }
      
      setPage(newPage);
      await fetchChatContent(newPage);
      
      // Save progress
      if (sessionId && cardId) {
          try {
              await fetch(`/api/cards/${cardId}/chat-sessions/${sessionId}/progress`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ page: newPage })
              });
          } catch (e) {
              console.error("Failed to save progress");
          }
      }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>正在加载聊天记录 (第 {page} 页)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-destructive gap-4">
        <p>{error}</p>
        <Button variant="outline" onClick={() => fetchChatContent(page)}>重试</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border rounded-lg bg-background/50 relative group/viewer overflow-hidden">
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

      <div className="flex-1 overflow-hidden p-4">
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            data={messages}
            totalCount={messages.length}
            components={{
                Footer: () => (
                    !hasMore && totalCount > 0 ? (
                        <div className="text-center py-4 bg-green-500/10 text-green-600 text-xs font-medium rounded-lg mt-4 mb-2">
                            已全部加载完毕
                        </div>
                    ) : null
                )
            }}
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
      
      {/* Pagination Controls */}
      {(sessionId && cardId) && (
          <div className="flex flex-col border-t bg-muted/20 shrink-0">
              <div className="flex items-center justify-between px-4 py-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={page <= 1 || loading}
                    onClick={() => changePage(page - 1)}
                  >
                    上一页
                  </Button>
                  
                  <span className="text-sm text-muted-foreground font-mono">
                      第 {page}/{Math.ceil(totalCount / LIMIT) || '?'} 页
                  </span>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={!hasMore || loading}
                    onClick={() => changePage(page + 1)}
                  >
                    下一页
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
}
