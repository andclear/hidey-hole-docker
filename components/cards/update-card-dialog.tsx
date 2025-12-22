"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UpdateCardDialogProps {
  cardId: string;
  currentVersion: number;
  onSuccess?: () => void;
}

export function UpdateCardDialog({ cardId, currentVersion, onSuccess }: UpdateCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [changelog, setChangelog] = useState("");
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpdate = async () => {
    if (!file) {
      toast.error("请选择要上传的新版本图片");
      return;
    }

    if (!changelog.trim()) {
        toast.error("请填写更新日志");
        return;
    }

    setUpdating(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("changelog", changelog);

    try {
      const res = await fetch(`/api/cards/${cardId}/update`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`成功更新至 v${currentVersion + 1}`);
        setOpen(false);
        setFile(null);
        setChangelog("");
        if (onSuccess) onSuccess();
        
        // Dispatch event to refresh card details
        window.dispatchEvent(new CustomEvent('card-updated', { detail: { cardId } }));
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch (e) {
      console.error(e);
      toast.error("网络错误");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          更新版本
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>更新角色卡 (v{currentVersion} → v{currentVersion + 1})</DialogTitle>
          <DialogDescription>
            上传新的 PNG 文件以覆盖当前版本。旧版本将自动归档到历史记录中。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file">新版本图片 (PNG)</Label>
            <Input 
                id="file" 
                type="file" 
                accept="image/png"
                onChange={handleFileChange} 
            />
            {file && (
                <p className="text-xs text-muted-foreground">
                    已选择: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="changelog">更新日志 (Changelog)</Label>
            <Textarea
              id="changelog"
              placeholder="例如：修复了性格描述中的错别字；优化了开场白..."
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              className="h-24"
            />
            <p className="text-xs text-muted-foreground">
                请简要描述此版本的更改内容，这将帮助用户了解更新详情。
            </p>
          </div>

          <div className="bg-amber-500/10 p-3 rounded-md border border-amber-500/20 flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">注意</p>
                  <p className="text-xs mt-1">
                      更新将覆盖当前卡片的主数据。元数据将会使用新版卡片中的。如果需要旧版，可以到版本历史中下载。
                  </p>
              </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleUpdate} disabled={updating || !file}>
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
