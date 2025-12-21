"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock, Calendar, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlaySessionListProps {
  cardId: string;
}

export function PlaySessionList({ cardId }: PlaySessionListProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cardId) fetchSessions();
  }, [cardId]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/cards/${cardId}/sessions`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    try {
      const res = await fetch(`/api/play-sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        toast.success("已删除");
      } else {
        toast.error("删除失败");
      }
    } catch (error) {
      toast.error("网络错误");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">试吃记录 ({sessions.length})</h3>
        <PlaySessionDialog 
          cardId={cardId} 
          open={open} 
          onOpenChange={setOpen} 
          onSuccess={(newSession) => {
            setSessions([newSession, ...sessions]);
            setOpen(false);
          }} 
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">加载中...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border border-dashed rounded-lg bg-muted/30">
            <p>还没有试吃过这个角色哦 ~</p>
            <Button variant="link" onClick={() => setOpen(true)}>
              去记录第一次
            </Button>
          </div>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="relative group">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(session.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(session.played_at).toLocaleDateString()} {new Date(session.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {session.duration_minutes > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {session.duration_minutes} 分钟
                    </div>
                  )}
                  {session.rating > 0 && (
                     <div className="flex items-center gap-1 text-primary font-medium">
                      <Star className="h-3.5 w-3.5 fill-primary" />
                      {session.rating} 分
                    </div>
                  )}
                   {session.mood && (
                    <Badge variant="outline" className={cn(
                      "text-xs px-1.5 py-0 h-5",
                      session.mood === 'fire' && "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20",
                      session.mood === 'sleepy' && "border-blue-400 text-blue-500 bg-blue-50 dark:bg-blue-950/20",
                    )}>
                      {session.mood === 'fire' ? '🔥 火热' : session.mood === 'sleepy' ? '💤 无聊' : '😐 一般'}
                    </Badge>
                  )}
                </div>
                
                {(session.model_used || session.api_provider) && (
                  <div className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded inline-block">
                    {session.api_provider} / {session.model_used}
                  </div>
                )}

                {session.notes && (
                  <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                    {session.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

interface PlaySessionDialogProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (session: any) => void;
}

function PlaySessionDialog({ cardId, open, onOpenChange, onSuccess }: PlaySessionDialogProps) {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      played_at: formData.get("played_at") ? new Date(formData.get("played_at") as string).toISOString() : new Date().toISOString(),
      duration_minutes: parseInt(formData.get("duration_minutes") as string) || 0,
      model_used: formData.get("model_used"),
      api_provider: formData.get("api_provider"),
      rating: parseInt(formData.get("rating") as string) || 0,
      mood: formData.get("mood"),
      notes: formData.get("notes"),
    };

    try {
      const res = await fetch(`/api/cards/${cardId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("记录已保存");
        onSuccess(result.data);
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          记录试吃
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加试吃记录</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="played_at">时间</Label>
              <Input 
                id="played_at" 
                name="played_at" 
                type="datetime-local" 
                defaultValue={new Date().toISOString().slice(0, 16)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">时长 (分钟)</Label>
              <Input 
                id="duration_minutes" 
                name="duration_minutes" 
                type="number" 
                min="0"
                placeholder="30" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api_provider">API 提供商</Label>
              <Input id="api_provider" name="api_provider" placeholder="OpenAI / Claude..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model_used">模型</Label>
              <Input id="model_used" name="model_used" placeholder="gpt-4o / sonnet..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rating">评分 (1-5)</Label>
              <Select name="rating" defaultValue="3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ (5)</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ (4)</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ (3)</SelectItem>
                  <SelectItem value="2">⭐⭐ (2)</SelectItem>
                  <SelectItem value="1">⭐ (1)</SelectItem>
                  <SelectItem value="0">未评分</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mood">体验 (Mood)</Label>
              <Select name="mood" defaultValue="neutral">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fire">🔥 火热 (Fire)</SelectItem>
                  <SelectItem value="neutral">😐 一般 (Neutral)</SelectItem>
                  <SelectItem value="sleepy">💤 无聊 (Sleepy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">笔记</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              placeholder="这次体验如何？发生了什么有趣的对话？" 
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存记录"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
