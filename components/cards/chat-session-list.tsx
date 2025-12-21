
"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Trash2, ExternalLink, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ChatViewer } from "./chat-viewer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

import { RegexScriptViewer, RegexScript } from "./regex-script-viewer";
import { Badge } from "@/components/ui/badge";

interface ChatSessionListProps {
  cardId: string;
  cardName: string;
}

export function ChatSessionList({ cardId, cardName }: ChatSessionListProps) {
  // Use SWR for fetching
  const { data: sessionData, mutate: mutateSessions } = useSWR(
    `/api/cards/${cardId}/chat-sessions`, 
    fetcher
  );
  const { data: regexData, mutate: mutateRegex } = useSWR(
    `/api/cards/${cardId}`, 
    fetcher
  );

  const sessions = sessionData?.success ? sessionData.data : [];
  const displayRegex = regexData?.success ? regexData.data.regex_scripts || [] : [];
  const loading = !sessionData && !regexData;
  
  const [uploading, setUploading] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const LOAD_INCREMENT = 10;
  
  const visibleSessions = sessions.slice(0, displayCount);
  const hasMore = displayCount < sessions.length;

  const handleUpdateRegex = async (newScripts: RegexScript[]) => {
    try {
      mutateRegex({ ...regexData, data: { ...regexData.data, regex_scripts: newScripts } }, false); // Optimistic
      
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
             regex_scripts: newScripts 
        })
      });
      
      if (!res.ok) throw new Error("Update failed");
      toast.success("显示优化正则已更新");
      mutateRegex(); // Sync
    } catch (e) {
      toast.error("更新失败");
      mutateRegex(); // Revert
    }
  };

  // Old fetch functions removed in favor of SWR

  // Edit State
  const [editingSession, setEditingSession] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowed = ['.jsonl', '.txt'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("只支持 .jsonl 或 .txt 格式的聊天记录");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path_prefix", "chat_history");

    try {
      const res = await fetch(`/api/cards/${cardId}/upload-s3`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("上传成功");
        mutateSessions(); // Refresh list
      } else {
        toast.error("上传失败: " + data.error);
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRename = async () => {
      if (!editingSession || !newName.trim()) return;
      
      setRenaming(true);
      try {
          const res = await fetch(`/api/cards/${cardId}/chat-sessions/${editingSession.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ file_name: newName.trim() })
          });
          
          if (res.ok) {
              toast.success("重命名成功");
              mutateSessions();
              setEditingSession(null);
          } else {
              toast.error("重命名失败");
          }
      } catch (e) {
          toast.error("网络错误");
      } finally {
          setRenaming(false);
      }
  };

  const openRenameDialog = (session: any) => {
      setEditingSession(session);
      setNewName(session.file_name);
  };

  const handleDelete = async (session: any) => {
    if (!confirm(`确定要删除聊天记录 "${session.file_name}" 吗？此操作将同步删除云端文件。`)) return;

    try {
        const res = await fetch(`/api/cards/${cardId}/chat-sessions/${session.id}`, {
            method: "DELETE"
        });
        
        if (res.ok) {
            toast.success("删除成功");
            mutateSessions();
        } else {
            const data = await res.json();
            toast.error("删除失败: " + (data.error || "未知错误"));
        }
    } catch (error) {
        toast.error("网络错误");
    }
  };

  const handleView = async (session: any) => {
    // Open window immediately to avoid popup blocker
    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
        toast.error("无法打开新窗口，请允许弹窗");
        return;
    }
    
    // Set initial loading state
    newWindow.document.write(`
      <html>
        <head>
          <title>加载中...</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #666; }
            .loader { width: 24px; height: 24px; border: 2px solid #ddd; border-top-color: #333; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <div>正在获取文件链接...</div>
        </body>
      </html>
    `);

    try {
      const res = await fetch(`/api/storage/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: session.s3_key })
      });
      const data = await res.json();
      if (data.success) {
        // Redirect the window to the viewer
        const viewerUrl = `/viewer?url=${encodeURIComponent(data.url)}&cardId=${cardId}&cardName=${encodeURIComponent(cardName)}&sessionId=${session.id}`;
        newWindow.location.href = viewerUrl;
      } else {
        newWindow.close();
        toast.error("无法获取文件链接");
      }
    } catch (error) {
      newWindow.close();
      toast.error("网络错误");
    }
  };

  if (loading) return <div>加载聊天记录中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">聊天记录存档</h3>
        <div className="relative">
          <input
            type="file"
            id="chat-upload"
            className="hidden"
            accept=".jsonl,.txt"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button disabled={uploading} asChild>
            <label htmlFor="chat-upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "上传中..." : "上传记录"}
            </label>
          </Button>
        </div>
      </div>

      {/* Viewing URL Logic Removed, handled by new window */}
      
      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">
            暂无上传的聊天记录
          </div>
        ) : (
          visibleSessions.map((session) => (
            <Card key={session.id} className="hover:bg-muted/50 transition-colors group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium truncate max-w-[300px]" title={session.file_name}>
                      {session.file_name}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                      <span>{(session.file_size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{session.message_count || "?"} 条消息</span>
                      <span>•</span>
                      <span>{new Date(session.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleView(session)}>
                    <ExternalLink className="h-4 w-4 mr-1" /> 查看
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openRenameDialog(session)}
                    title="重命名"
                  >
                     <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={() => handleDelete(session)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {hasMore && (
        <div className="flex justify-center pt-2">
            <Button 
                variant="outline" 
                onClick={() => setDisplayCount(prev => prev + LOAD_INCREMENT)}
                className="w-full sm:w-auto"
            >
                加载更多历史记录 ({sessions.length - displayCount} 剩余)
            </Button>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>重命名文件</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                  <Label>文件名</Label>
                  <Input 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="输入新文件名" 
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">注意：这只会修改显示名称，不会修改原始文件的存储路径。</p>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingSession(null)}>取消</Button>
                  <Button onClick={handleRename} disabled={renaming}>
                      {renaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      保存
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <div className="mt-8 pt-6 border-t space-y-4">
         <div className="flex items-center gap-2">
             <h4 className="font-semibold text-sm">聊天记录显示优化正则</h4>
             <Badge variant="outline">仅影响预览</Badge>
         </div>
         <p className="text-xs text-muted-foreground">
             这些正则规则仅用于优化此角色卡的聊天记录预览效果（如修复格式、替换敏感词），不会修改原始文件。
         </p>
         <RegexScriptViewer 
             scripts={displayRegex} 
             editable={true}
             onSave={handleUpdateRegex}
         />
      </div>
    </div>
  );
}
