"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color?: string;
  description?: string;
  created_at: string;
}

export function CategorySettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (e) {
      toast.error("加载分类失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("分类名称必填");
      return;
    }

    setSaving(true);
    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}` 
        : "/api/categories";
      const method = editingCategory ? "PATCH" : "POST";

      const payload = {
          name: formData.name,
          color: formData.color,
          description: formData.description
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingCategory ? "更新成功" : "创建成功");
        setIsDialogOpen(false);
        fetchCategories();
      } else {
        const json = await res.json();
        toast.error(json.error || "操作失败");
      }
    } catch (e) {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此分类吗？该分类下的角色卡将变为未分类。")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("已删除");
        fetchCategories();
      } else {
        toast.error("删除失败");
      }
    } catch (e) {
      toast.error("网络错误");
    }
  };

  const openAdd = () => {
    setEditingCategory(null);
    setFormData({ name: "", color: "#3b82f6", description: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ 
      name: cat.name, 
      color: cat.color || "#3b82f6", 
      description: cat.description || "" 
    });
    setIsDialogOpen(true);
  };

  const PRESET_COLORS = [
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>分类管理</CardTitle>
          <CardDescription>
            创建和管理角色卡分类。
          </CardDescription>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> 新建分类
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            暂无分类
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[100px]">颜色</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium align-middle">
                      <div className="inline-flex items-center gap-2 ml-2">
                      <Tag className="h-4 w-4 mr-1" style={{ color: cat.color }} />
                      {cat.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cat.description || "-"}</TableCell>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded-full border" 
                        style={{ backgroundColor: cat.color }} 
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "编辑分类" : "新建分类"}</DialogTitle>
              <DialogDescription>
                设置分类名称和显示颜色。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">名称</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">颜色标签</Label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(color => (
                          <button
                              key={color}
                              type="button"
                              className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${formData.color === color ? 'ring-2 ring-ring ring-offset-2 scale-110' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setFormData({ ...formData, color })}
                              title={color}
                          />
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      id="color" 
                      type="color" 
                      value={formData.color} 
                      onChange={e => setFormData({...formData, color: e.target.value})} 
                      className="w-12 h-10 p-1 cursor-pointer shrink-0"
                    />
                    <Input 
                      value={formData.color} 
                      onChange={e => setFormData({...formData, color: e.target.value})} 
                      placeholder="#000000"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">描述 (可选)</Label>
                <Input 
                  id="description" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
