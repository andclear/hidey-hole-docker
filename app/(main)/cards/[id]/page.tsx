"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Star, Trash2, Edit, 
  MessageSquare, Hash, Save, X, Eye, EyeOff, FileText, Loader2,
  Languages, BrainCircuit, ArrowRight, RefreshCw, Link as LinkIcon, Copy, Download
} from "lucide-react";
import { saveAs } from 'file-saver';
import { toast } from "sonner";
import { PersonalReview } from "@/components/cards/personal-review";
import { WorldInfoViewer } from "@/components/cards/world-info-viewer";
import { RegexScriptViewer, RegexScript } from "@/components/cards/regex-script-viewer";
import { cn } from "@/lib/utils";
import { ChatSessionList } from "@/components/cards/chat-session-list";
import { useAIAnalysis } from "@/components/ai/ai-analysis-provider";
import { AIAnalysisStatus } from "@/components/ai/ai-analysis-status";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { VersionHistoryList } from "@/components/cards/version-history-list";
import { UpdateCardDialog } from "@/components/cards/update-card-dialog";

interface CardState {
  id: string;
  name: string;
  description?: string;
  user_notes?: string;
  user_rating?: string | number;
  is_favorite?: boolean;
  is_nsfw?: boolean;
  tags?: { id: string; name: string }[];
  storage_path?: string;
  thumbnail_path?: string; // Add thumbnail path support
  file_size: number;
  file_type?: string;
  first_message?: string;
  creator_notes?: string;
  personality?: string;
  scenario?: string;
  ai_summary?: string;
  data?: Record<string, any>;
  regex_scripts?: RegexScript[];
  current_version?: number;
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // SWR for Data Fetching
  const { data: swrData, error, mutate } = useSWR(id ? `/api/cards/${id}` : null, fetcher, {
    revalidateOnFocus: false, // Don't reload on window focus to prevent flickering
    dedupingInterval: 5000,   // Cache for 5 seconds
    revalidateIfStale: false // Don't revalidate immediately if we have cache
  });
  
  const card = swrData?.success ? swrData.data : null;
  const loading = !card && !error;

  // Edit Dialog State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    user_notes: "",
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [userNotesSaving, setUserNotesSaving] = useState(false);
  const { addTask, getTask } = useAIAnalysis();
  
  const [publicDomain, setPublicDomain] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchSettings();
    
    // Listen for AI update events
    const handleUpdate = (e: CustomEvent<{cardId: string}>) => {
        if (e.detail.cardId === id) {
            mutate();
        }
    };
    window.addEventListener('card-updated', handleUpdate as EventListener);
    return () => window.removeEventListener('card-updated', handleUpdate as EventListener);
  }, [id, mutate]);

  const fetchSettings = async () => {
      try {
          const res = await fetch("/api/settings");
          const data = await res.json();
          // Correctly access storage_config and s3_public_url
          if (data.success && data.data?.storage_config?.s3_public_url) {
              setPublicDomain(data.data.storage_config.s3_public_url.replace(/\/$/, ""));
          }
      } catch (e) {
          console.error("Failed to fetch settings");
      }
  };

  // No need for explicit useEffect to fetch card, SWR handles it
  
  const refreshCard = async (newRating?: number) => {
      // If we need to optimistically update or just revalidate
      await mutate();
  };

  const openEditDialog = () => {
    const currentCard = card;
    if (!currentCard) return;
    setEditForm({
      name: currentCard.name,
      description: currentCard.description || "",
      user_notes: currentCard.user_notes || "",
      tags: currentCard.tags?.map((t: {name: string}) => t.name) || []
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveMetadata = async () => {
    if (!editForm.name) {
      toast.error("名称不能为空");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        toast.success("保存成功");
        setIsEditDialogOpen(false);
        mutate(); // Revalidate SWR
      } else {
        toast.error("保存失败");
      }
    } catch (e) {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagInput.trim();
      if (!val) return;
      if (editForm.tags.length >= 30) {
        toast.error("标签最多30个");
        return;
      }
      if (!editForm.tags.includes(val)) {
        setEditForm({ ...editForm, tags: [...editForm.tags, val] });
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditForm({ ...editForm, tags: editForm.tags.filter(t => t !== tagToRemove) });
  };

  const handleUpdateRegex = async (newScripts: RegexScript[]) => {
    try {
      // Optimistic update
      mutate({ ...swrData, data: { ...card, regex_scripts: newScripts } }, false);

      const res = await fetch(`/api/cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regex_scripts: newScripts })
      });
      
      if (!res.ok) throw new Error("Update failed");
      toast.success("显示优化正则已更新");
      mutate(); // Revalidate fully
    } catch (e) {
      toast.error("更新失败");
      mutate(); // Revert
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要将此角色卡移入回收站吗？")) return;
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("已删除");
        router.push("/cards");
      } else {
        toast.error("删除失败");
      }
    } catch (error) {
      toast.error("网络错误");
    }
  };

  const toggleFavorite = async () => {
    if (!card) return;
    const newVal = !card.is_favorite;
    
    // Optimistic
    mutate({ ...swrData, data: { ...card, is_favorite: newVal } }, false);

    try {
      await fetch(`/api/cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: newVal })
      });
      mutate(); // Sync
    } catch (error) {
      mutate(); // Revert
      toast.error("操作失败");
    }
  };

  const toggleNsfw = async (checked: boolean) => {
    if (!card) return;
    
    // Optimistic
    mutate({ ...swrData, data: { ...card, is_nsfw: checked } }, false);

    try {
        await fetch(`/api/cards/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_nsfw: checked })
        });
        mutate(); // Sync
    } catch (e) {
        mutate(); // Revert
        toast.error("设置失败");
    }
  };

  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingTranslation, setLoadingTranslation] = useState<Record<string, boolean>>({});
  const [greetingIndex, setGreetingIndex] = useState(0);

  const handleTranslateText = async (id: string, text: string) => {
      if (!text) return;
      setLoadingTranslation(prev => ({ ...prev, [id]: true }));
      try {
          const res = await fetch("/api/ai/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  text: text,
                  target_lang: "Simplified Chinese"
              })
          });

          const json = await res.json();
          if (json.success) {
              setTranslations(prev => ({ ...prev, [id]: json.data }));
          } else {
              if (json.code === 'NO_AI_CHANNEL') {
                  toast.error("未配置 AI 模型，无法翻译");
              } else {
                  toast.error(json.error || "翻译失败");
              }
          }
      } catch (e) {
          toast.error("网络错误");
      } finally {
          setLoadingTranslation(prev => ({ ...prev, [id]: false }));
      }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  
  if (!card) return null;

  // Image URL logic
  let imageUrl = "/docs/default.jpg";
  if (card.storage_path) {
    if (card.storage_path.startsWith("http")) {
      imageUrl = card.storage_path;
    } else {
       // Prefer thumbnail for display if available
       const path = card.thumbnail_path || card.storage_path;
       imageUrl = `/api/images/${path}`;
    }
  }

  const allGreetings = [card.first_message, ...(card.data?.alternate_greetings || [])].filter(Boolean);
  const aiTask = getTask(id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 1. Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col min-w-0">
             <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold truncate leading-tight group relative" title={card.name}>
                    <span className="group-hover:text-primary transition-colors">{card.name}</span>
                </h1>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                    v{card.current_version || 1}
                </Badge>
             </div>
             <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{card.file_type?.toUpperCase()}</span>
                <span className="w-px h-3 bg-border"></span>
                <span>{(card.file_size / 1024).toFixed(1)} KB</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={toggleFavorite} title={card.is_favorite ? "取消收藏" : "收藏"}>
            <Star className={cn("h-5 w-5", card.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={openEditDialog} title="编辑元数据">
             <Edit className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleDelete} title="删除">
             <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[400px_1fr]">
        
        {/* Left Column: Poster & Quick Info (Scrollable on mobile) */}
        <ScrollArea className="h-full border-r bg-muted/10 lg:block hidden">
          <div className="p-4 lg:p-6 space-y-6">
            {/* Poster Card */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-md border bg-muted group max-w-[320px] mx-auto lg:mx-0">
              <img 
                src={imageUrl} 
                alt={card.name} 
                className={cn(
                    "w-full h-full object-cover transition-transform duration-700 hover:scale-105",
                    card.is_nsfw && "blur-xl scale-110 hover:scale-125 hover:blur-none transition-all"
                )}
                onError={(e) => {
                  e.currentTarget.src = "/docs/default.jpg";
                  e.currentTarget.className = "w-full h-full object-cover";
                }}
              />
              {/* Overlay Rating on Poster */}
              {card.user_rating && card.user_rating !== "-" && (
                 <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 shadow-sm">
                    <span className="text-sm font-bold text-white">{Number(card.user_rating).toFixed(1)}</span>
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                 </div>
              )}
              <div className="absolute top-3 right-3 z-20">
                 <button
                    onClick={() => toggleNsfw(!card.is_nsfw)}
                    className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10 hover:bg-black/60 transition-colors"
                 >
                    {card.is_nsfw ? (
                        <EyeOff className="h-4 w-4 text-white/90" />
                    ) : (
                        <Eye className="h-4 w-4 text-white/90" />
                    )}
                 </button>
              </div>
            </div>

            {/* Tags & Rating */}
            <div className="space-y-4 max-w-[320px] mx-auto lg:mx-0">
               
               {/* Download Card */}
               <div className="-mt-3 grid grid-cols-2 gap-2">
                   <Button 
                       className="w-full col-span-1"
                       disabled={isDownloading}
                       onClick={async () => {
                           setIsDownloading(true);
                           try {
                               // 1. Get download URL (S3 Presigned or External)
                               toast.info("正在获取下载链接...");
                               const res = await fetch("/api/cards/batch/download-urls", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ card_ids: [card.id] })
                               });
                               const data = await res.json();
                               
                               if (!data.success || !data.urls || data.urls.length === 0) {
                                   throw new Error("获取下载链接失败");
                               }

                               const fileUrl = data.urls[0].url;
                               const fileName = data.urls[0].name;

                               // 2. Download File
                               // Try direct fetch first
                               try {
                                   const fileRes = await fetch(fileUrl, { mode: 'cors' });
                                   if (!fileRes.ok) throw new Error(`Direct download failed: ${fileRes.status}`);
                                   const blob = await fileRes.blob();
                                   saveAs(blob, fileName);
                                   toast.success("下载完成");
                               } catch (directError) {
                                   console.error("Direct download failed, trying proxy", directError);
                                   // Fallback to proxy
                                   const proxyRes = await fetch(`/api/proxy-download?url=${encodeURIComponent(fileUrl)}`);
                                   if (!proxyRes.ok) throw new Error("Proxy download failed");
                                   const blob = await proxyRes.blob();
                                   saveAs(blob, fileName);
                                   toast.success("下载完成");
                               }

                           } catch (e) {
                               console.error(e);
                               toast.error("下载失败");
                           } finally {
                               setIsDownloading(false);
                           }
                       }}
                   >
                       {isDownloading ? (
                           <>
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                               下载中
                           </>
                       ) : (
                           <>
                               <Download className="mr-2 h-4 w-4" />
                               下载
                           </>
                       )}
                   </Button>
                   
                   <UpdateCardDialog 
                        cardId={card.id} 
                        currentVersion={card.current_version || 1} 
                        onSuccess={() => mutate()} 
                   />
               </div>

               {card.user_notes && (
                   <div className="p-3 bg-muted/30 rounded-lg border text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                       <div className="text-xs font-semibold uppercase mb-1 opacity-70">用户备注</div>
                       {card.user_notes}
                   </div>
               )}
              
              <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                     <Hash className="h-4 w-4" /> 标签
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {card.tags && card.tags.length > 0 ? (
                        card.tags.map((tag: {id: string, name: string}) => (
                        <Badge key={tag.id} variant="secondary" className="px-2 py-1 text-xs font-normal bg-card hover:bg-card/80">
                            {tag.name}
                        </Badge>
                        ))
                    ) : (
                        <span className="text-sm text-muted-foreground italic">暂无标签</span>
                    )}
                  </div>
               </div>

            </div>
          </div>
        </ScrollArea>

        {/* Right Column: Tabs Content */}
        <div className="h-full flex flex-col min-w-0 min-h-0 bg-background">
           <Tabs defaultValue="metadata" className="flex-1 flex flex-col min-h-0">
             <div className="px-4 py-3 bg-card border-b">
               <TabsList className="grid w-full grid-cols-4 h-11 bg-muted/60 p-1 rounded-lg">
                 <TabsTrigger value="metadata" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                   元数据
                 </TabsTrigger>
                 <TabsTrigger value="chat" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                   聊天记录
                 </TabsTrigger>
                 <TabsTrigger value="review" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                   个人评价
                 </TabsTrigger>
                 <TabsTrigger value="history" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                   版本历史
                 </TabsTrigger>
               </TabsList>
             </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <div className="p-4 lg:p-8 max-w-4xl h-full min-h-0">
                {/* Metadata Tab */}
                <TabsContent value="metadata" className="mt-0 h-full flex flex-col min-h-0">
                   <Tabs defaultValue="overview" className="w-full h-full flex flex-col min-h-0">
                        <div className="mb-4 sm:mb-6 shrink-0 px-4 pt-4">
                            <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/50 p-1 rounded-xl">
                                <TabsTrigger 
                                    value="overview" 
                                    className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium"
                                >
                                    概览
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="world-info" 
                                    className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium"
                                >
                                    设定集 ({card.data?.character_book?.entries?.length || 0})
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="regex" 
                                    className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium"
                                >
                                    正则 ({card.data?.extensions?.regex_scripts?.length || 0})
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="flex-1 mt-0 min-h-0 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-4 lg:p-8 max-w-4xl pb-20">
                                {/* Mobile-only Poster Section */}
                                <div className="lg:hidden mb-6 space-y-6">
                                    {/* Poster Card */}
                                    <div className="relative aspect-[2/3] w-full max-w-[280px] mx-auto overflow-hidden rounded-xl shadow-md border bg-muted">
                                        <img 
                                            src={imageUrl} 
                                            alt={card.name} 
                                            className={cn(
                                                "w-full h-full object-cover",
                                                card.is_nsfw && "blur-xl hover:blur-none transition-all duration-500"
                                            )}
                                        />
                                        {card.user_rating && card.user_rating !== "-" && (
                                            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 shadow-sm">
                                                <span className="text-sm font-bold text-white">{Number(card.user_rating).toFixed(1)}</span>
                                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 z-20">
                                            <button
                                                onClick={() => toggleNsfw(!card.is_nsfw)}
                                                className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10 hover:bg-black/60 transition-colors"
                                            >
                                                {card.is_nsfw ? (
                                                    <EyeOff className="h-4 w-4 text-white/90" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-white/90" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Actions & Info */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button className="w-full" onClick={async () => {
                                                   setIsDownloading(true);
                                                   try {
                                                       toast.info("正在获取下载链接...");
                                                       const res = await fetch("/api/cards/batch/download-urls", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ card_ids: [card.id] })
                                                       });
                                                       const data = await res.json();
                                                       if (!data.success || !data.urls || data.urls.length === 0) throw new Error("失败");
                                                       const fileUrl = data.urls[0].url;
                                                       const fileName = data.urls[0].name;
                                                       try {
                                                           const fileRes = await fetch(fileUrl, { mode: 'cors' });
                                                           if (!fileRes.ok) throw new Error();
                                                           const blob = await fileRes.blob();
                                                           saveAs(blob, fileName);
                                                       } catch {
                                                           const proxyRes = await fetch(`/api/proxy-download?url=${encodeURIComponent(fileUrl)}`);
                                                           const blob = await proxyRes.blob();
                                                           saveAs(blob, fileName);
                                                       }
                                                       toast.success("下载完成");
                                                   } catch {
                                                       toast.error("下载失败");
                                                   } finally {
                                                       setIsDownloading(false);
                                                   }
                                               }}>
                                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                                下载卡片
                                            </Button>
                                            <UpdateCardDialog 
                                                cardId={card.id} 
                                                currentVersion={card.current_version || 1} 
                                                onSuccess={() => mutate()} 
                                                trigger={
                                                    <Button variant="outline" className="w-full">
                                                        <RefreshCw className="mr-2 h-4 w-4"/> 
                                                        更新版本
                                                    </Button>
                                                }
                                            />
                                        </div>

                                        {card.user_notes && (
                                            <div className="p-3 bg-muted/30 rounded-lg border text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                                <div className="text-xs font-semibold uppercase mb-1 opacity-70">用户备注</div>
                                                {card.user_notes}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                <Hash className="h-4 w-4" /> 标签
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {card.tags && card.tags.length > 0 ? (
                                                    card.tags.map((tag: {id: string, name: string}) => (
                                                    <Badge key={tag.id} variant="secondary" className="px-2 py-1 text-xs font-normal bg-card hover:bg-card/80">
                                                        {tag.name}
                                                    </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">暂无标签</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Accordion type="multiple" className="w-full space-y-4" defaultValue={["ai_summary"]}>
                                {/* AI Summary Card */}
                                <div className="border rounded-lg bg-card overflow-hidden">
                                   {card.ai_summary ? (
                                       <div className="p-4 space-y-3">
                                           <div className="flex items-center gap-2 text-primary font-medium">
                                               <BrainCircuit className="h-4 w-4" />
                                               <span>AI 简介</span>
                                           </div>
                                           <div className="text-sm leading-relaxed text-muted-foreground">
                                               {card.ai_summary}
                                           </div>
                                           <div className="flex justify-end">
                                               <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => addTask(id, card.name)}>
                                                   <RefreshCw className="h-3 w-3 mr-1" /> 重新分析
                                               </Button>
                                           </div>
                                       </div>
                                   ) : (
                                       <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 bg-muted/20">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <BrainCircuit className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="font-medium">AI 智能分析</h3>
                                                <p className="text-xs text-muted-foreground max-w-[250px]">
                                                    自动生成角色简介和标签，深入挖掘角色魅力。
                                                </p>
                                            </div>
                                            {aiTask ? (
                                                <AIAnalysisStatus status={aiTask.status} error={aiTask.error} />
                                            ) : (
                                                <Button size="sm" onClick={() => addTask(id, card.name)}>
                                                    开始分析
                                                </Button>
                                            )}
                                       </div>
                                   )}
                                </div>

                                {/* Greetings - Folded by default */}
                                <AccordionItem value="greetings" className="border rounded-lg px-4 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-primary" />
                                            <span>开场白 & 问候语 ({allGreetings.length})</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 px-2"
                                                onClick={() => setGreetingIndex(i => Math.max(0, i - 1))}
                                                disabled={greetingIndex === 0}
                                                title="上一条"
                                            >
                                                <ArrowLeft className="h-4 w-4 mr-1" />
                                                上一条
                                            </Button>
                                            <span className="text-xs text-muted-foreground">
                                                {greetingIndex + 1} / {allGreetings.length}
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 px-2"
                                                onClick={() => setGreetingIndex(i => Math.min(allGreetings.length - 1, i + 1))}
                                                disabled={greetingIndex >= allGreetings.length - 1}
                                                title="下一条"
                                            >
                                                下一条
                                                <ArrowRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full"></div>
                                            <div className="pl-4 text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                                                {allGreetings[greetingIndex]}
                                            </div>
                                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-6 px-2 text-[10px]" 
                                                    onClick={() => handleTranslateText(`greeting-${greetingIndex}`, allGreetings[greetingIndex] || "")}
                                                disabled={loadingTranslation[`greeting-${greetingIndex}`]}
                                            >
                                                    {loadingTranslation[`greeting-${greetingIndex}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3 mr-1" />}
                                                    翻译
                                                </Button>
                                            </div>
                                            {translations[`greeting-${greetingIndex}`] && (
                                                <div className="mt-2 ml-4 bg-primary/5 p-2 rounded text-sm text-foreground/80 border border-primary/10">
                                                    <div className="text-[10px] text-primary mb-1">AI 翻译</div>
                                                    {translations[`greeting-${greetingIndex}`]}
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {card.ai_summary && (
                                    <AccordionItem value="ai_summary_legacy" className="border rounded-lg px-4 bg-card hidden">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <div className="flex items-center gap-2">
                                                <BrainCircuit className="h-4 w-4 text-purple-500" />
                                                <span>AI 简介 (旧版)</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-4">
                                            <div className="bg-purple-500/5 p-4 rounded-lg text-sm leading-relaxed border border-purple-500/20">
                                                {card.ai_summary}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )}

                                <AccordionItem value="description" className="border rounded-lg px-4 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <span>描述 (Description)</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4 relative group">
                                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono bg-muted/30 p-3 rounded">
                                            {card.description || "无描述"}
                                        </div>
                                        {card.description && (
                                            <>
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="h-6 px-2 text-[10px]" 
                                                    onClick={() => handleTranslateText('desc', card.description || "")}
                                                    disabled={loadingTranslation['desc']}
                                                >
                                                    {loadingTranslation['desc'] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3 mr-1" />}
                                                    翻译
                                                </Button>
                                            </div>
                                            {translations['desc'] && (
                                                <div className="mt-2 bg-primary/5 p-3 rounded text-sm text-foreground/80 border border-primary/10">
                                                    <div className="text-[10px] text-primary mb-1">AI 翻译</div>
                                                    {translations['desc']}
                                                </div>
                                            )}
                                            </>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>

                                {card.personality && (
                                    <AccordionItem value="personality" className="border rounded-lg px-4 bg-card">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <span>性格 (Personality)</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-4 relative group">
                                            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono bg-muted/30 p-3 rounded">
                                                {card.personality}
                                            </div>
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="h-6 px-2 text-[10px]" 
                                                    onClick={() => handleTranslateText('personality', card.personality || "")}
                                                    disabled={loadingTranslation['personality']}
                                                >
                                                    {loadingTranslation['personality'] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3 mr-1" />}
                                                    翻译
                                                </Button>
                                            </div>
                                            {translations['personality'] && (
                                                <div className="mt-2 bg-primary/5 p-3 rounded text-sm text-foreground/80 border border-primary/10">
                                                    <div className="text-[10px] text-primary mb-1">AI 翻译</div>
                                                    {translations['personality']}
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                )}

                                {card.scenario && (
                                    <AccordionItem value="scenario" className="border rounded-lg px-4 bg-card">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <span>场景 (Scenario)</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-4 relative group">
                                            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono bg-muted/30 p-3 rounded">
                                                {card.scenario}
                                            </div>
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="h-6 px-2 text-[10px]" 
                                                    onClick={() => handleTranslateText('scenario', card.scenario || "")}
                                                    disabled={loadingTranslation['scenario']}
                                                >
                                                    {loadingTranslation['scenario'] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3 mr-1" />}
                                                    翻译
                                                </Button>
                                            </div>
                                            {translations['scenario'] && (
                                                <div className="mt-2 bg-primary/5 p-3 rounded text-sm text-foreground/80 border border-primary/10">
                                                    <div className="text-[10px] text-primary mb-1">AI 翻译</div>
                                                    {translations['scenario']}
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                )}

                                {card.creator_notes && (
                                    <AccordionItem value="creator_notes" className="border rounded-lg px-4 bg-card">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <span>作者备注</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-4 relative group">
                                            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                                {card.creator_notes}
                                            </div>
                                             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="h-6 px-2 text-[10px]" 
                                                    onClick={() => handleTranslateText('creator_notes', card.creator_notes || "")}
                                                    disabled={loadingTranslation['creator_notes']}
                                                >
                                                    {loadingTranslation['creator_notes'] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3 mr-1" />}
                                                    翻译
                                                </Button>
                                            </div>
                                            {translations['creator_notes'] && (
                                                <div className="mt-2 bg-primary/5 p-3 rounded text-sm text-foreground/80 border border-primary/10">
                                                    <div className="text-[10px] text-primary mb-1">AI 翻译</div>
                                                    {translations['creator_notes']}
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                )}
                            </Accordion>
                            </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="world-info" className="flex-1 mt-0 min-h-0">
                            <ScrollArea className="h-full -mr-4 pr-4">
                            <div className="pb-10">
                            <WorldInfoViewer data={card.data?.character_book} />
                            </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="regex" className="flex-1 mt-0 min-h-0">
                            <ScrollArea className="h-full -mr-4 pr-4">
                            <div className="pb-10">
                             <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-sm">角色卡内置正则 (Read Only)</h4>
                                        <Badge variant="secondary">只读</Badge>
                                    </div>
                                    <RegexScriptViewer 
                                        scripts={card.data?.extensions?.regex_scripts} 
                                        editable={false}
                                    />
                                </div>
                                <div className="space-y-2 pt-6 border-t">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-sm">显示优化正则 (Chat Display)</h4>
                                        <Badge variant="outline">可编辑</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        此处的正则仅在聊天显示时生效，不会修改角色卡原始数据。
                                    </p>
                                    <RegexScriptViewer 
                                        scripts={card.regex_scripts || []} 
                                        editable={true}
                                        onSave={handleUpdateRegex}
                                    />
                                </div>
                             </div>
                            </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                 </TabsContent>

                 {/* Chat Tab */}
                 <TabsContent value="chat" className="mt-0 h-full overflow-hidden">
                    <ScrollArea className="h-full">
                         <div className="p-4 pb-20">
                            <ChatSessionList cardId={id} cardName={card.name} />
                         </div>
                    </ScrollArea>
                 </TabsContent>

                 {/* Review Tab */}
                 <TabsContent value="review" className="mt-0 h-full overflow-hidden">
                     <ScrollArea className="h-full">
                         <div className="pb-10">
                            <PersonalReview cardId={id} onScoreUpdate={refreshCard} />
                         </div>
                    </ScrollArea>
                 </TabsContent>

                 {/* History Tab */}
                 <TabsContent value="history" className="mt-0 h-full overflow-hidden">
                     <ScrollArea className="h-full">
                         <div className="pb-10 p-4 lg:p-8 max-w-4xl">
                            <VersionHistoryList 
                                cardId={id} 
                                currentVersion={card.current_version || 1}
                                currentChangelog={card.data?.version_notes} 
                            />
                         </div>
                    </ScrollArea>
                 </TabsContent>
               </div>
             </div>
           </Tabs>
        </div>
      </div>

      {/* Edit Metadata Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>编辑元数据</DialogTitle>
                <DialogDescription>
                    修改角色卡的基本信息和标签。这不会修改原始 PNG 文件。
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">名称</Label>
                    <Input 
                        id="name" 
                        value={editForm.name} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                    />
                </div>
                
                <div className="grid gap-2">
                    <Label>标签 ({editForm.tags.length}/30)</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/20 min-h-[80px]">
                        {editForm.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                                {tag}
                                <button onClick={() => removeTag(tag)} className="hover:text-destructive p-0.5 rounded-full hover:bg-muted">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                        <input 
                            className="bg-transparent border-none outline-none text-sm min-w-[120px] flex-1 h-6 mt-1"
                            placeholder="输入标签并回车..."
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                        />
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="user_notes">用户备注</Label>
                    <Textarea 
                        id="user_notes" 
                        className="min-h-[100px] font-mono text-sm"
                        value={editForm.user_notes}
                        onChange={e => setEditForm({...editForm, user_notes: e.target.value})}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
                <Button onClick={handleSaveMetadata} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存更改
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
