"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Trash2, RefreshCcw, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";

interface TrashItem {
  id: string;
  name: string;
  description: string;
  deleted_at: string;
  file_size: number;
}

export default function TrashPage() {
  const router = useRouter();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    try {
      const res = await fetch("/api/trash");
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      toast.error("加载回收站失败");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  const toggleSelection = (id: string, checked: boolean) => {
    const newSet = new Set(selectedItems);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedItems(newSet);
  };

  const handleBatchRestore = async () => {
    if (selectedItems.size === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/cards/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            card_ids: Array.from(selectedItems),
            action: "restore"
        })
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => !selectedItems.has(item.id)));
        setSelectedItems(new Set());
        toast.success("已恢复选中项目");
        router.refresh();
      } else {
        toast.error("恢复失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchPermanentDelete = async () => {
    if (selectedItems.size === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/cards/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            card_ids: Array.from(selectedItems),
            action: "permanent_delete"
        })
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => !selectedItems.has(item.id)));
        setSelectedItems(new Set());
        toast.success("已永久删除选中项目");
      } else {
        toast.error("删除失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/cards/${id}/restore`, { method: "POST" });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success("已恢复");
        router.refresh();
      } else {
        toast.error("恢复失败");
      }
    } catch (error) {
      toast.error("网络错误");
    }
  };

  const handleDeletePermanent = async (id: string) => {
    try {
      const res = await fetch(`/api/cards/${id}/permanent`, { method: "DELETE" });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success("已永久删除");
      } else {
        toast.error("删除失败");
      }
    } catch (error) {
      toast.error("网络错误");
    }
  };

  const handleRestoreAll = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/trash/actions", { method: "POST" });
      if (res.ok) {
        setItems([]);
        toast.success("全部已恢复");
        router.refresh();
      } else {
        toast.error("操作失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/trash/actions", { method: "DELETE" });
      if (res.ok) {
        setItems([]);
        toast.success("回收站已清空");
      } else {
        toast.error("操作失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">回收站</h2>
          <p className="text-muted-foreground">
            已删除的角色卡。它们可以在这里被恢复或永久删除。
          </p>
        </div>
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <>
                <Button 
                    variant="outline" 
                    onClick={handleBatchRestore} 
                    disabled={actionLoading}
                >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    恢复选中 ({selectedItems.size})
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="destructive" 
                            disabled={actionLoading}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除选中 ({selectedItems.size})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>永久删除选中项目？</AlertDialogTitle>
                            <AlertDialogDescription>
                                此操作将永久删除选中的 {selectedItems.size} 个项目。
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBatchPermanentDelete} className="bg-destructive">
                                确认删除
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleRestoreAll} 
            disabled={items.length === 0 || actionLoading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            全部恢复
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={items.length === 0 || actionLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空回收站
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定要清空回收站吗？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将永久删除回收站中的所有 {items.length} 个项目。此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  确认清空
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={items.length > 0 && selectedItems.size === items.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>名称</TableHead>
              <TableHead>删除时间</TableHead>
              <TableHead>大小</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  回收站是空的
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => toggleSelection(item.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(item.deleted_at).toLocaleString()}</TableCell>
                  <TableCell>{(item.file_size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRestore(item.id)}
                      title="恢复"
                    >
                      <RefreshCcw className="h-4 w-4 text-green-600" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="永久删除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>永久删除 &quot;{item.name}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            此操作无法撤销。该角色卡将从数据库和存储中永久移除。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePermanent(item.id)} className="bg-destructive">
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
