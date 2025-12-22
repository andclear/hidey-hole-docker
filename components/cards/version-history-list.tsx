"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, History, Loader2, FileText, ArrowDownToLine } from "lucide-react";
import { saveAs } from 'file-saver';
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

interface VersionHistoryListProps {
  cardId: string;
  currentVersion: number;
  currentChangelog?: string;
}

export function VersionHistoryList({ cardId, currentVersion, currentChangelog }: VersionHistoryListProps) {
  const { data, error, isLoading } = useSWR(`/api/cards/${cardId}/history`, fetcher);

  const history = data?.success ? data.data : [];

  const handleDownload = async (version: any) => {
    try {
        const fileUrl = version.file_path.startsWith("http") 
            ? version.file_path 
            : `/api/images/${version.file_path}`; // Using our proxy logic if needed or direct if public
        
        // Wait, version.file_path is storage_path. 
        // We should try to get a download URL like we do for main card.
        // But for simplicity, let's use the proxy logic if it's not a full URL.
        
        // Actually, we can use the batch download API logic but for a single custom path?
        // Or just use the /api/images proxy which redirects to a presigned URL.
        // Yes, /api/images/[...path] generates a presigned URL and redirects.
        // So fetching it might return the image data if we follow redirect.
        
        toast.info(`正在下载 v${version.version_number}...`);
        
        // Use proxy download to handle CORS and filename
        const proxyRes = await fetch(`/api/proxy-download?url=${encodeURIComponent(version.file_path.startsWith("http") ? version.file_path : window.location.origin + `/api/images/${version.file_path}`)}`);
        
        // Actually, if we pass a local relative URL to proxy-download, it might fail if it expects absolute.
        // Better:
        // If it's a relative path in DB, construct the /api/images URL.
        // Then fetch that.
        
        const targetUrl = version.file_path.startsWith("http") 
            ? version.file_path 
            : `/api/images/${version.file_path}`;

        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error("Download failed");
        
        const blob = await res.blob();
        saveAs(blob, version.file_name || `card_v${version.version_number}.png`);
        toast.success("下载完成");

    } catch (e) {
        console.error(e);
        toast.error("下载失败");
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  
  if (history.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
              <History className="h-8 w-8 mb-2 opacity-50" />
              <p>暂无历史版本</p>
              <p className="text-xs mt-1">当您更新角色卡时，旧版本将存档于此。</p>
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4" />
          <h3 className="font-semibold">版本历史</h3>
      </div>
      
      <div className="relative border-l ml-4 space-y-6 pl-6 pb-2">
        {/* Current Version Indicator */}
        <div className="relative">
            <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="font-bold">v{currentVersion} (当前)</span>
                    <Badge variant="secondary" className="text-[10px]">Latest</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    当前正在使用的版本。
                </p>
                {currentChangelog && (
                    <p className="text-sm text-foreground/90 bg-background/50 p-2 rounded border border-border/50 max-w-[400px] mt-1">
                        {currentChangelog}
                    </p>
                )}
            </div>
        </div>

        {/* History Items */}
        {history.map((ver: any) => (
            <div key={ver.id} className="relative group">
                <span className="absolute -left-[31px] top-6 h-3 w-3 rounded-full bg-muted-foreground/30 ring-4 ring-background group-hover:bg-primary/50 transition-colors" />
                <Card className="bg-muted/30 hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                            {/* Thumbnail */}
                            <div className="h-16 w-12 shrink-0 rounded bg-muted overflow-hidden border">
                                <img 
                                    src={ver.thumbnail_path ? `/api/images/${ver.thumbnail_path}` : `/api/images/${ver.file_path}`} 
                                    className="h-full w-full object-cover opacity-80"
                                    onError={(e) => e.currentTarget.src = "/docs/default.jpg"}
                                    alt={`v${ver.version_number}`}
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">v{ver.version_number}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(ver.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                {ver.changelog ? (
                                    <p className="text-sm text-foreground/90 bg-background/50 p-2 rounded border border-border/50 max-w-[400px]">
                                        {ver.changelog}
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        无更新日志
                                    </p>
                                )}
                                
                                <div className="text-xs text-muted-foreground flex gap-2">
                                    <span>{ver.file_name}</span>
                                    {/* Size info if available in JSON data or we could store it */}
                                </div>
                            </div>
                        </div>

                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="shrink-0"
                            onClick={() => handleDownload(ver)}
                        >
                            <Download className="h-4 w-4 mr-1" />
                            下载
                        </Button>
                    </CardContent>
                </Card>
            </div>
        ))}
      </div>
    </div>
  );
}
