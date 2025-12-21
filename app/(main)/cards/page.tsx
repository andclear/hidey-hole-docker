"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardGridItem } from "@/components/cards/card-grid-item";
import { 
  Loader2, Search, LayoutGrid, List as ListIcon, 
  Layers, Download, FolderInput, Trash2, X, CheckSquare, Square, MoreHorizontal,
  Plus, Hash, ChevronLeft, ChevronRight
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Card {
  id: string;
  name: string;
  storage_path?: string;
  thumbnail_path?: string;
  user_rating?: number;
  is_nsfw?: boolean;
  is_favorite?: boolean;
  tags?: Array<{ id: string; name: string; }>;
  [key: string]: unknown;
}

interface Category {
  id: string;
  name: string;
  color?: string;
  count?: number; // Optional count if we implement it
}

interface SettingsResponse {
  success: boolean;
  data: {
    default_sort_field?: string;
    default_sort_order?: string;
    general_config?: {
      cards_per_page?: string;
    };
    [key: string]: any;
  };
}

export default function CardsPage() {
  // UI State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // --- SWR Data Fetching ---

  // 1. Settings (for limit)
  const { data: settingsData, mutate: mutateSettings } = useSWR<SettingsResponse>("/api/settings", fetcher);
  
  // Load from LocalStorage on mount
  useEffect(() => {
    const localSort = localStorage.getItem("cards_sort");
    const localOrder = localStorage.getItem("cards_order");
    if (localSort) setSort(localSort);
    if (localOrder) setOrder(localOrder);
  }, []);

  // Sync with DB settings
  useEffect(() => {
    if (settingsData?.success && settingsData.data) {
        const dbSort = settingsData.data.default_sort_field;
        const dbOrder = settingsData.data.default_sort_order;
        
        if (dbSort && dbSort !== sort) {
            setSort(dbSort);
            localStorage.setItem("cards_sort", dbSort);
        }
        if (dbOrder && dbOrder !== order) {
            setOrder(dbOrder);
            localStorage.setItem("cards_order", dbOrder);
        }

        if (settingsData.data.general_config?.cards_per_page) {
            setLimit(parseInt(settingsData.data.general_config.cards_per_page));
        }
    }
  }, [settingsData]);

  // Handlers for Sort/Order
  const handleSortChange = async (newSort: string) => {
      setSort(newSort);
      localStorage.setItem("cards_sort", newSort);
      
      // Optimistic update
      await mutateSettings((data) => {
        if (!data) return undefined;
        return {
          ...data,
          data: { ...data.data, default_sort_field: newSort }
        };
      }, false);

      await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ default_sort_field: newSort })
      });
      
      mutateSettings(); // Revalidate to be sure
  };

  const handleOrderChange = async () => {
      const newOrder = order === "asc" ? "desc" : "asc";
      setOrder(newOrder);
      localStorage.setItem("cards_order", newOrder);

      // Optimistic update
      await mutateSettings((data) => {
        if (!data) return undefined;
        return {
          ...data,
          data: { ...data.data, default_sort_order: newOrder }
        };
      }, false);

      await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ default_sort_order: newOrder })
      });
      
      mutateSettings();
  };

  // 2. Categories
  const { data: categoriesData, mutate: mutateCategories } = useSWR("/api/categories", fetcher);
  const categories: Category[] = categoriesData?.success ? categoriesData.data : [];

  // 3. Tags
  const { data: tagsData } = useSWR("/api/tags", fetcher);
  const allTags: {name: string, count: number}[] = tagsData?.success ? tagsData.data : [];

  // 4. Cards (Main Data)
  // Construct query key based on all filters
  const queryParams = useMemo(() => {
      const params = new URLSearchParams({
        q: debouncedSearch,
        sort,
        order,
        limit: limit.toString(),
        page: page.toString(),
      });

      if (selectedCategory) {
          params.append("category_id", selectedCategory);
      } else if (selectedCategory === "uncategorized") {
          params.append("category_id", "null");
      }

      if (selectedTag) {
          params.append("tag", selectedTag);
      }
      return params.toString();
  }, [debouncedSearch, sort, order, limit, page, selectedCategory, selectedTag]);

  const { data: cardsData, error: cardsError, mutate: mutateCards } = useSWR<{success: boolean, data: Card[], meta: { total: number; hasMore: boolean } }>(
      `/api/cards?${queryParams}`, 
      fetcher,
      { keepPreviousData: true } // Keep showing previous page while loading new one
  );

  const cards = cardsData?.success ? cardsData.data : [];
  const total = cardsData?.meta?.total || 0;
  const hasMore = cardsData?.meta?.hasMore || false;
  const loading = !cardsData && !cardsError;

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  // Batch Action State
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTargetCategory, setMoveTargetCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const [isProcessing, setIsProcessing] = useState(false);

  // Predefined colors
  const presetColors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#64748b", // slate
  ];

  // Old fetch effects removed in favor of SWR

  // Selection Logic
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedCards(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map(c => c.id)));
    }
  };

  const toggleCardSelection = useCallback((id: string, selected: boolean) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Batch Actions
  const handleBatchDownload = async () => {
    if (selectedCards.size === 0) return;

    try {
      toast.info("正在获取下载链接...");
      const res = await fetch("/api/cards/batch/download-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_ids: Array.from(selectedCards) })
      });

      const data = await res.json();
      
      if (!data.success || !data.urls) {
          throw new Error("Failed to get download URLs");
      }

      toast.info(`开始打包 ${data.urls.length} 个文件...`);
      
      // If single file, download directly
      if (data.urls.length === 1) {
          const item = data.urls[0];
          try {
              // Try direct fetch first
              const fileRes = await fetch(item.url, { mode: 'cors' });
              if (!fileRes.ok) throw new Error(`Direct download failed: ${fileRes.status}`);
              const blob = await fileRes.blob();
              saveAs(blob, item.name);
              toast.success("下载完成");
              setIsSelectionMode(false);
              setSelectedCards(new Set());
              return;
          } catch (e) {
              console.error("Direct download failed, trying proxy", e);
              try {
                  const proxyRes = await fetch(`/api/proxy-download?url=${encodeURIComponent(item.url)}`);
                  if (!proxyRes.ok) throw new Error("Proxy download failed");
                  const blob = await proxyRes.blob();
                  saveAs(blob, item.name);
                  toast.success("下载完成");
                  setIsSelectionMode(false);
                  setSelectedCards(new Set());
                  return;
              } catch (proxyError) {
                  toast.error("下载失败");
                  return;
              }
          }
      }

      const zip = new JSZip();
      let completed = 0;

      // Parallel download
      const downloadPromises = data.urls.map(async (item: { name: string, url: string }) => {
          try {
              // Use our proxy endpoint to fetch file content, avoiding CORS issues
              // We'll pass the presigned URL as a query param or part of body
              // Actually, since we have the presigned URL, we can fetch it directly IF CORS is allowed on S3 bucket.
              // If S3 CORS is not configured, we need a proxy.
              // Assuming S3 CORS might block direct browser fetch if not configured.
              // Let's try fetching via a simple proxy if direct fetch fails, or just use a proxy.
              
              // Direct fetch from presigned URL usually works if bucket CORS allows GET from origin.
              // If not, we get a CORS error (which is likely "Download failed").
              
              // Let's try to fetch directly first.
              const fileRes = await fetch(item.url, { mode: 'cors' });
              
              if (!fileRes.ok) throw new Error(`Download failed: ${fileRes.status}`);
              const blob = await fileRes.blob();
              zip.file(item.name, blob);
              completed++;
          } catch (e) {
              console.error(`Failed to download ${item.name}`, e);
              // Fallback: try via proxy if direct fetch fails (CORS issue)
              try {
                  const proxyRes = await fetch(`/api/proxy-download?url=${encodeURIComponent(item.url)}`);
                  if (!proxyRes.ok) throw new Error("Proxy download failed");
                  const blob = await proxyRes.blob();
                  zip.file(item.name, blob);
                  completed++;
              } catch (proxyError) {
                   console.error(`Proxy failed for ${item.name}`, proxyError);
                   zip.file(`${item.name}.txt`, `Download failed for ${item.name}. Error: ${e}`);
              }
          }
      });

      await Promise.all(downloadPromises);

      toast.info("正在压缩...");
      const content = await zip.generateAsync({ type: "blob" });
      
      // Format date as YYYYMMDDHHmmss
      const now = new Date();
      const timestamp = now.getFullYear() +
                        String(now.getMonth() + 1).padStart(2, '0') +
                        String(now.getDate()).padStart(2, '0') +
                        '_' + 
                        String(now.getHours()).padStart(2, '0') +
                        String(now.getMinutes()).padStart(2, '0') +
                        String(now.getSeconds()).padStart(2, '0');
                        
      saveAs(content, `card_${timestamp}.zip`);
      
      toast.success("下载完成");
      setIsSelectionMode(false);
      setSelectedCards(new Set());

    } catch (e) {
      console.error(e);
      toast.error("下载出错");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedCards.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedCards.size} 张角色卡吗？它们将被移动到回收站。`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/cards/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            card_ids: Array.from(selectedCards),
            action: "delete"
        })
      });

      if (res.ok) {
        toast.success("已移动到回收站");
        mutateCards(); // Refresh cards
        mutateCategories(); // Refresh categories (counts might change)
        setIsSelectionMode(false);
        setSelectedCards(new Set());
      } else {
        toast.error("操作失败");
      }
    } catch (e) {
      toast.error("网络错误");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchMove = async () => {
    if (!moveTargetCategory && !newCategoryName) {
        toast.error("请选择分类或输入新分类名称");
        return;
    }

    setIsProcessing(true);
    try {
        const res = await fetch("/api/cards/batch", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                card_ids: Array.from(selectedCards),
                action: "move",
                category_id: moveTargetCategory === "new" ? null : moveTargetCategory,
                new_category_name: moveTargetCategory === "new" ? newCategoryName : undefined,
                new_category_color: moveTargetCategory === "new" ? newCategoryColor : undefined
            })
        });

        if (res.ok) {
            toast.success("移动成功");
            setIsMoveDialogOpen(false);
            mutateCards(); // Refresh cards
            mutateCategories(); // Refresh categories
            setIsSelectionMode(false);
            setSelectedCards(new Set());
            setNewCategoryName("");
            setMoveTargetCategory("");
            setNewCategoryColor("#3b82f6");
        } else {
            toast.error("移动失败");
        }
    } catch (e) {
        toast.error("网络错误");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar (Desktop) */}
      <div className="w-56 shrink-0 hidden md:flex flex-col border-r pr-6 space-y-6">
        <div>
           <h2 className="text-2xl font-bold tracking-tight mb-2 flex items-center">
             <Layers className="mr-2 h-6 w-6" />
             角色库
           </h2>
           <p className="text-muted-foreground text-sm">
             浏览和管理您的角色卡。
           </p>
        </div>

        <div className="space-y-1">
            <Button 
                variant={selectedCategory === null ? "secondary" : "ghost"} 
                className="w-full justify-start"
                onClick={() => { setSelectedCategory(null); setSelectedTag(null); }}
            >
                <LayoutGrid className="mr-2 h-4 w-4" /> 全部
            </Button>
            
            <div className="pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                分类
            </div>
            {categories.map(cat => (
                <Button 
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => { setSelectedCategory(cat.id); setSelectedTag(null); }}
                >
                    <div className="flex items-center flex-1 min-w-0">
                        <span 
                            className="w-2 h-2 rounded-full mr-2 shrink-0" 
                            style={{ backgroundColor: cat.color || "#ccc" }} 
                        />
                        <span className="truncate">{cat.name}</span>
                    </div>
                    {typeof cat.count === 'number' && (
                        <Badge variant="secondary" className="ml-2 px-1.5 h-5 text-[10px] shrink-0 bg-muted-foreground/10 text-muted-foreground">
                            {cat.count}
                        </Badge>
                    )}
                </Button>
            ))}
             <Button 
                variant={selectedCategory === "uncategorized" ? "secondary" : "ghost"} 
                className="w-full justify-start opacity-70"
                onClick={() => { setSelectedCategory("uncategorized"); setSelectedTag(null); }}
            >
                <span className="text-sm">未分类</span>
            </Button>
        </div>

        {allTags.length > 0 && (
            <div className="space-y-1">
                <div className="pt-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Hash className="h-3 w-3" /> 标签
                </div>
                <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                        <Badge 
                            key={tag.name}
                            variant={selectedTag === tag.name ? "default" : "outline"}
                            className="cursor-pointer hover:bg-secondary/80 transition-colors"
                            onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                        >
                            {tag.name} 
                            <span className="ml-1 opacity-60 text-[10px]">{tag.count}</span>
                        </Badge>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 space-y-4">
          
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-20">
             {isSelectionMode ? (
                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full animate-in fade-in slide-in-from-top-2 duration-200">
                     <div className="flex items-center w-full sm:w-auto justify-between mb-2 sm:mb-0">
                         <span className="text-sm font-medium mr-auto">
                             已选择 {selectedCards.size} 项
                         </span>
                         <Button variant="ghost" size="sm" onClick={toggleSelectionMode} className="sm:hidden">
                             <X className="mr-2 h-4 w-4" /> 取消
                         </Button>
                     </div>

                     <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Button size="sm" variant="secondary" onClick={toggleSelectAll} className="flex-1 sm:flex-none">
                             {selectedCards.size === cards.length ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                             <span className="inline">全选</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleBatchDownload} disabled={selectedCards.size === 0} className="flex-1 sm:flex-none">
                             <Download className="h-4 w-4 mr-1" /> <span className="inline">下载</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsMoveDialogOpen(true)} disabled={selectedCards.size === 0} className="flex-1 sm:flex-none">
                             <FolderInput className="h-4 w-4 mr-1" /> <span className="inline">移动</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleBatchDelete} disabled={selectedCards.size === 0} className="flex-1 sm:flex-none">
                             <Trash2 className="h-4 w-4 mr-1" /> <span className="inline">删除</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={toggleSelectionMode} className="hidden sm:inline-flex">
                             <X className="mr-2 h-4 w-4" /> 取消
                         </Button>
                     </div>
                 </div>
             ) : (
                 <>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                            placeholder="搜索..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                         <Select value={sort} onValueChange={handleSortChange}>
                            <SelectTrigger className="w-[110px] shrink-0">
                            <SelectValue placeholder="排序" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="created_at">添加时间</SelectItem>
                            <SelectItem value="name">名称</SelectItem>
                            <SelectItem value="user_rating">评分</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={handleOrderChange}
                        >
                            {order === "asc" ? "↑" : "↓"}
                        </Button>
                        <div className="border-l pl-2 flex gap-1 shrink-0">
                             <Button
                                variant={view === "grid" ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setView("grid")}
                                title="画廊模式"
                             >
                                <LayoutGrid className="h-4 w-4" />
                             </Button>
                             <Button
                                variant={view === "list" ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setView("list")}
                                title="列表模式"
                             >
                                <ListIcon className="h-4 w-4" />
                             </Button>
                        </div>
                        <div className="border-l pl-2 flex gap-1 shrink-0">
                             <Button variant={isSelectionMode ? "secondary" : "outline"} onClick={toggleSelectionMode}>
                                 <CheckSquare className="h-4 w-4 sm:mr-2" /> 
                                 <span className="hidden sm:inline">选择</span>
                             </Button>
                        </div>
                    </div>
                 </>
             )}
          </div>

      {/* Mobile Category Scroll (Moved below toolbar as requested) */}
      <div className="md:hidden flex flex-col space-y-2">
          {/* Mobile Category Scroll */}
          <div className="flex overflow-x-auto pb-2 gap-2 -mx-4 px-4 scrollbar-none">
             <Button 
                variant={selectedCategory === null ? "secondary" : "outline"} 
                size="sm"
                className="whitespace-nowrap rounded-full shrink-0"
                onClick={() => setSelectedCategory(null)}
            >
                全部
            </Button>
            {categories.map(cat => (
                <Button 
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "secondary" : "outline"} 
                    size="sm"
                    className="whitespace-nowrap rounded-full shrink-0"
                    onClick={() => setSelectedCategory(cat.id)}
                >
                    <span 
                        className="w-2 h-2 rounded-full mr-2" 
                        style={{ backgroundColor: cat.color || "#ccc" }} 
                    />
                    {cat.name}
                </Button>
            ))}
             <Button 
                variant={selectedCategory === "uncategorized" ? "secondary" : "outline"} 
                size="sm"
                className="whitespace-nowrap rounded-full shrink-0"
                onClick={() => setSelectedCategory("uncategorized")}
            >
                未分类
            </Button>
          </div>
      </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4">
            {loading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>没有找到相关角色卡</p>
                <Button variant="link" onClick={() => { setSearch(""); setSelectedCategory(null); }}>清除筛选</Button>
            </div>
            ) : (
                <>
                  {view === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-8">
                        {cards.map((card) => (
                        <CardGridItem 
                            key={card.id} 
                            card={card} 
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedCards.has(card.id)}
                            onSelect={toggleCardSelection}
                        />
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-2 pb-8">
                       <div className="grid grid-cols-1 gap-4">
                        {cards.map((card) => (
                          <CardGridItem 
                            key={card.id} 
                            card={card}
                            viewMode={view}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedCards.has(card.id)}
                            onSelect={toggleCardSelection}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Pagination Controls */}
                  {total > limit && (
                      <div className="flex items-center justify-center gap-4 py-4 mt-auto border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                              <ChevronLeft className="h-4 w-4 mr-1" /> 上一页
                          </Button>
                          <span className="text-sm text-muted-foreground">
                              第 {page} 页 / 共 {Math.ceil(total / limit)} 页
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPage(p => p + 1)}
                            disabled={!hasMore}
                          >
                              下一页 <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                      </div>
                  )}
                </>
            )}
          </div>
      </div>

      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>移动至分类</DialogTitle>
                  <DialogDescription>
                      将选中的 {selectedCards.size} 张角色卡移动到...
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div className="grid gap-2">
                      <Label>选择分类</Label>
                      <Select value={moveTargetCategory} onValueChange={setMoveTargetCategory}>
                          <SelectTrigger>
                              <SelectValue placeholder="选择目标分类..." />
                          </SelectTrigger>
                          <SelectContent>
                              {categories.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                        {cat.name}
                                      </div>
                                  </SelectItem>
                              ))}
                              <SelectItem value="uncategorized">未分类</SelectItem>
                              <SelectItem value="new">
                                  <div className="flex items-center gap-2 font-medium text-primary">
                                      <Plus className="h-4 w-4" /> 新建分类...
                                  </div>
                              </SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  
                  {moveTargetCategory === "new" && (
                      <div className="grid gap-4 animate-in fade-in slide-in-from-top-1">
                          <div className="grid gap-2">
                            <Label>新分类名称</Label>
                            <Input 
                                value={newCategoryName} 
                                onChange={e => setNewCategoryName(e.target.value)}
                                placeholder="输入分类名称"
                                autoFocus
                            />
                          </div>
                          <div className="grid gap-2">
                             <Label>分类颜色</Label>
                             <div className="flex gap-2 flex-wrap">
                                {presetColors.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setNewCategoryColor(color)}
                                        className={cn(
                                            "w-6 h-6 rounded-full border transition-transform hover:scale-110",
                                            newCategoryColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <div className="flex items-center gap-2 ml-2">
                                    <span className="text-xs text-muted-foreground">自定义:</span>
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden border">
                                        <input 
                                            type="color" 
                                            value={newCategoryColor}
                                            onChange={e => setNewCategoryColor(e.target.value)}
                                            className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 cursor-pointer border-0"
                                        />
                                    </div>
                                </div>
                             </div>
                          </div>
                      </div>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>取消</Button>
                  <Button onClick={handleBatchMove} disabled={isProcessing}>
                      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      确认移动
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
