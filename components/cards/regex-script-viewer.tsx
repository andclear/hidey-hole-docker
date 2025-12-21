
"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Code2, ArrowRight, Plus, Trash2, Save, Edit2, X, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface RegexScript {
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  placement: number[];
  disabled?: boolean;
  markdownOnly?: boolean;
  promptOnly?: boolean;
  runOnEdit?: boolean;
}

interface RegexScriptViewerProps {
  scripts?: RegexScript[];
  onSave?: (newScripts: RegexScript[]) => Promise<void>;
  editable?: boolean;
  allowManualAdd?: boolean;
}

export function RegexScriptViewer({ 
  scripts: initialScripts = [], 
  onSave, 
  editable = false,
  allowManualAdd = true 
}: RegexScriptViewerProps) {
  const [scripts, setScripts] = useState<RegexScript[]>(initialScripts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempScript, setTempScript] = useState<RegexScript | null>(null);
  const [saving, setSaving] = useState(false);

  const initialKey = useMemo(() => JSON.stringify(initialScripts ?? []), [initialScripts]);
  useEffect(() => {
    const next = initialScripts ?? [];
    setScripts(prev => {
      const prevKey = JSON.stringify(prev ?? []);
      return prevKey === initialKey ? prev : next;
    });
  }, [initialKey]);

  const getPlacementLabel = (p: number) => {
    switch (p) {
      case 1: return "User Input";
      case 2: return "AI Output";
      case 3: return "Slash Command";
      case 5: return "World Info";
      default: return `Unknown (${p})`;
    }
  };

  const handleEdit = (script: RegexScript) => {
    setEditingId(script.id);
    setTempScript({ ...script });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTempScript(null);
  };

  const handleSaveEdit = () => {
    if (!tempScript) return;
    const newScripts = scripts.map(s => s.id === tempScript.id ? tempScript : s);
    setScripts(newScripts);
    setEditingId(null);
    setTempScript(null);
    if (onSave) onSave(newScripts);
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除此脚本吗？")) return;
    const newScripts = scripts.filter(s => s.id !== id);
    setScripts(newScripts);
    if (onSave) onSave(newScripts);
  };

  const handleAdd = () => {
    const newScript: RegexScript = {
      id: crypto.randomUUID(),
      scriptName: "新正则脚本",
      findRegex: "",
      replaceString: "",
      placement: [1, 2] // Default to Input/Output
    };
    setScripts([newScript, ...scripts]); // Prepend instead of Append
    setEditingId(newScript.id);
    setTempScript(newScript);
  };

  const togglePlacement = (p: number) => {
    if (!tempScript) return;
    const current = tempScript.placement || [];
    if (current.includes(p)) {
      setTempScript({ ...tempScript, placement: current.filter(x => x !== p) });
    } else {
      setTempScript({ ...tempScript, placement: [...current, p].sort() });
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const json = JSON.parse(content);
        
        let newScriptsToAdd: RegexScript[] = [];

        // Support array of scripts or single script object
        if (Array.isArray(json)) {
            newScriptsToAdd = json.map((item: any) => ({
                id: item.id || crypto.randomUUID(),
                scriptName: item.scriptName || item.name || "导入的脚本",
                findRegex: item.findRegex || item.regex || "",
                replaceString: item.replaceString || item.replace || "",
                placement: item.placement || [1, 2],
                disabled: item.disabled || false,
                markdownOnly: item.markdownOnly || false,
                promptOnly: item.promptOnly || false,
                runOnEdit: item.runOnEdit || false
            }));
        } else if (typeof json === 'object') {
             // Handle single object import
             newScriptsToAdd = [{
                id: json.id || crypto.randomUUID(),
                scriptName: json.scriptName || json.name || "导入的脚本",
                findRegex: json.findRegex || json.regex || "",
                replaceString: json.replaceString || json.replace || "",
                placement: json.placement || [1, 2],
                disabled: json.disabled || false,
                markdownOnly: json.markdownOnly || false,
                promptOnly: json.promptOnly || false,
                runOnEdit: json.runOnEdit || false
             }];
        }

        if (newScriptsToAdd.length > 0) {
            const updatedScripts = [...scripts, ...newScriptsToAdd];
            setScripts(updatedScripts);
            if (onSave) onSave(updatedScripts);
            toast.success(`成功导入 ${newScriptsToAdd.length} 个正则脚本`);
        } else {
            toast.error("未找到有效的正则脚本数据");
        }
      } catch (err) {
        console.error(err);
        toast.error("解析 JSON 失败");
      } finally {
        // Reset input
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
            正则脚本 ({scripts.length})
            </h3>
        </div>
        {editable && (
            <div className="flex gap-2">
                <div className="relative">
                    <input
                        type="file"
                        id="regex-upload"
                        className="hidden"
                        accept=".json"
                        onChange={handleUpload}
                    />
                    <Button size="sm" variant="outline" asChild>
                        <label htmlFor="regex-upload" className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-1" /> 导入
                        </label>
                    </Button>
                </div>
                {allowManualAdd && (
                  <Button size="sm" onClick={handleAdd}>
                      <Plus className="h-4 w-4 mr-1" /> 添加
                  </Button>
                )}
            </div>
        )}
      </div>

      {scripts.length === 0 && (
        <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
          暂无正则脚本
        </div>
      )}

      <Accordion type="single" collapsible className="w-full space-y-4" value={editingId || undefined}>
        {scripts.map((script) => (
          <AccordionItem key={script.id} value={script.id} className="border rounded-lg px-4 bg-card">
            {editingId === script.id && tempScript ? (
                // EDIT MODE
                <div className="py-4 space-y-4">
                    <div className="grid gap-2">
                        <Label>脚本名称</Label>
                        <Input 
                            value={tempScript.scriptName} 
                            onChange={e => setTempScript({...tempScript, scriptName: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>查找正则 (Find Regex) - 如 /pattern/g</Label>
                        <Input 
                            className="font-mono text-sm"
                            value={tempScript.findRegex} 
                            onChange={e => setTempScript({...tempScript, findRegex: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>替换内容 (Replace String)</Label>
                        <Textarea 
                            className="font-mono text-sm min-h-[80px]"
                            value={tempScript.replaceString} 
                            onChange={e => setTempScript({...tempScript, replaceString: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>生效位置</Label>
                        <div className="flex gap-2 flex-wrap">
                            {[1, 2, 3, 5].map(p => (
                                <Badge 
                                    key={p}
                                    variant={tempScript.placement?.includes(p) ? "default" : "outline"}
                                    className="cursor-pointer select-none"
                                    onClick={() => togglePlacement(p)}
                                >
                                    {getPlacementLabel(p)}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 items-center border-t pt-4">
                        <div className="flex items-center gap-2">
                            <Switch 
                                checked={!tempScript.disabled}
                                onCheckedChange={c => setTempScript({...tempScript, disabled: !c})}
                            />
                            <Label>启用</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch 
                                checked={tempScript.markdownOnly}
                                onCheckedChange={c => setTempScript({...tempScript, markdownOnly: c})}
                            />
                            <Label>仅UI渲染 (Markdown Only)</Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>取消</Button>
                        <Button size="sm" onClick={handleSaveEdit}>保存</Button>
                    </div>
                </div>
            ) : (
                // VIEW MODE
                <>
                    <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex flex-col items-start text-left gap-2 w-full pr-4">
                        <div className="flex items-center gap-2 w-full">
                        <span className="font-medium text-sm">
                            {script.scriptName || "未命名脚本"}
                        </span>
                        {script.disabled && <Badge variant="destructive" className="text-[10px] h-5">禁用</Badge>}
                        {script.markdownOnly && <Badge variant="secondary" className="text-[10px] h-5">UI渲染仅</Badge>}
                        {script.promptOnly && <Badge variant="outline" className="text-[10px] h-5">Prompt仅</Badge>}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                        {script.placement?.map(p => (
                            <Badge key={p} variant="outline" className="text-[10px] bg-muted/50">
                            {getPlacementLabel(p)}
                            </Badge>
                        ))}
                        </div>
                    </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4 relative">
                        {editable && (
                            <div className="absolute top-0 right-0 flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                                    e.stopPropagation(); // Prevent accordion toggle? No, trigger is above.
                                    handleEdit(script);
                                }}>
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(script.id);
                                }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1.5">查找正则 (Find Regex)</div>
                        <div className="bg-muted rounded p-2 text-xs font-mono break-all border">
                        {script.findRegex}
                        </div>
                    </div>
                    
                    <div className="flex justify-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 rotate-90" />
                    </div>

                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1.5">替换内容 (Replace String)</div>
                        <div className="bg-muted rounded p-2 text-xs font-mono whitespace-pre-wrap border break-all">
                        {script.replaceString}
                        </div>
                    </div>
                    </AccordionContent>
                </>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
