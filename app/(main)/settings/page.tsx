"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Loader2, Database, Brain, Settings as SettingsIcon, Code, 
  Plus, Trash2, Check, X, RefreshCw, Zap, Layers
} from "lucide-react";
import { RegexScriptViewer, RegexScript } from "@/components/cards/regex-script-viewer";
import { CategorySettings } from "@/components/settings/category-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Settings {
  storage_config?: {
    s3_endpoint?: string;
    s3_bucket?: string;
    s3_region?: string;
    s3_access_key?: string;
    s3_secret_key?: string;
    s3_public_url?: string;
  };
  ai_config?: {
    // Legacy fields kept for compatibility or migrated
    ai_enabled?: boolean;
    auto_analyze?: boolean;
  };
  general_config?: {
    default_view?: string;
    cards_per_page?: number;
    trash_auto_delete_days?: number;
  };
  global_regex?: RegexScript[];
  [key: string]: unknown;
}

interface AIChannel {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_active: boolean;
  created_at?: string;
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  // SWR for Settings
  const { data: settingsData, mutate: mutateSettings } = useSWR("/api/settings", fetcher);
  const settings: Settings = settingsData?.success ? settingsData.data : {};
  const loading = !settingsData;

  // SWR for Channels
  const { data: channelsData, mutate: mutateChannels } = useSWR("/api/ai/channels", fetcher);
  const aiChannels: AIChannel[] = channelsData?.success ? channelsData.data : [];
  const channelLoading = !channelsData;

  // Local state for regex editing
  const [regexScripts, setRegexScripts] = useState<RegexScript[]>([]);
  
  // Sync regexScripts with SWR data when loaded
  useEffect(() => {
    if (settings.global_regex) {
      setRegexScripts(settings.global_regex);
    }
  }, [settings.global_regex]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<AIChannel | null>(null);
  const [testResult, setTestResult] = useState<{success: boolean, latency?: number, error?: string} | null>(null);
  const [testingChannel, setTestingChannel] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Form State for Channel
  const [channelForm, setChannelForm] = useState({
    name: "",
    base_url: "",
    api_key: "",
    model: ""
  });

  // Defaults
  const defaultStorage = {
    s3_endpoint: "",
    s3_bucket: "",
    s3_region: "auto",
    s3_access_key: "",
    s3_secret_key: "",
    s3_public_url: "",
  };

  const defaultGeneral = {
    default_view: "grid",
    cards_per_page: 20,
    trash_auto_delete_days: 0,
  };

  // Removed old fetch effects since SWR handles them

  const handleSave = async (section: string, values: unknown) => {
    setSaving(true);
    try {
      const payload = { [section]: values };
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        // Optimistic update via SWR
        mutateSettings({ ...settingsData, data: { ...settings, ...payload } }, false);
        toast.success("设置已保存");
        mutateSettings(); // Sync
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChannel = async () => {
    if (!channelForm.name || !channelForm.base_url) {
        toast.error("名称和 API 地址必填");
        return;
    }

    try {
        setSaving(true);
        const url = editingChannel 
            ? `/api/ai/channels/${editingChannel.id}`
            : "/api/ai/channels";
        
        const method = editingChannel ? "PATCH" : "POST";
        
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(channelForm)
        });

        if (res.ok) {
            toast.success(editingChannel ? "更新成功" : "添加成功");
            setIsDialogOpen(false);
            mutateChannels(); // Refresh
            setEditingChannel(null);
            setChannelForm({ name: "", base_url: "", api_key: "", model: "" });
            setTestResult(null);
            setFetchedModels([]);
        } else {
            toast.error("操作失败");
        }
    } catch (e) {
        toast.error("网络错误");
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("确定要删除此渠道吗？")) return;
    try {
        const res = await fetch(`/api/ai/channels/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("已删除");
            mutateChannels();
        } else {
            toast.error("删除失败");
        }
    } catch (e) {
        toast.error("网络错误");
    }
  };

  const handleSetActive = async (id: string, isActive: boolean) => {
      // Optimistic update
      mutateChannels({
        ...channelsData,
        data: aiChannels.map(c => ({
            ...c,
            is_active: c.id === id ? isActive : (isActive ? false : c.is_active)
        }))
      }, false);

      try {
          await fetch(`/api/ai/channels/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_active: isActive })
          });
          // Refresh to ensure server state consistency (e.g. disabling others)
          mutateChannels();
      } catch (e) {
          toast.error("更新状态失败");
          mutateChannels(); // Revert
      }
  };

  const handleTestChannel = async (formOverride?: Partial<typeof channelForm>) => {
      const data = formOverride || channelForm;
      if (!data.base_url) return;
      
      setTestingChannel(true);
      setTestResult(null);
      try {
          const res = await fetch("/api/ai/test", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  base_url: data.base_url,
                  api_key: data.api_key
              })
          });
          const json = await res.json();
          setTestResult(json);
      } catch (e) {
          if (e instanceof Error) {
            setTestResult({ success: false, error: e.message });
          } else {
            setTestResult({ success: false, error: "Unknown error" });
          }
      } finally {
          setTestingChannel(false);
      }
  };

  const handleFetchModels = async () => {
      if (!channelForm.base_url) return;
      setFetchingModels(true);
      try {
          const res = await fetch("/api/ai/models", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  base_url: channelForm.base_url,
                  api_key: channelForm.api_key
              })
          });
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
              // Extract model IDs
              const models = json.data.map((m: { id: string }) => m.id).sort();
              setFetchedModels(models);
              toast.success(`获取到 ${models.length} 个模型`);
          } else {
              toast.error(json.error || "获取模型失败");
          }
      } catch (e) {
          toast.error("获取模型失败");
      } finally {
          setFetchingModels(false);
      }
  };

  const openEdit = (channel: AIChannel) => {
      setEditingChannel(channel);
      setChannelForm({
          name: channel.name,
          base_url: channel.base_url,
          api_key: channel.api_key || "",
          model: channel.model || ""
      });
      setTestResult(null);
      setFetchedModels([]);
      setIsDialogOpen(true);
  };

  const openAdd = () => {
      setEditingChannel(null);
      setChannelForm({ name: "", base_url: "", api_key: "", model: "" });
      setTestResult(null);
      setFetchedModels([]);
      setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const storageConfig = { ...defaultStorage, ...(settings.storage_config || {}) };
  const generalConfig = { ...defaultGeneral, ...(settings.general_config || {}) };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">系统设置</h2>
        <p className="text-muted-foreground">
          管理存储、AI 服务和通用配置。
        </p>
      </div>

      <Tabs defaultValue="storage" className="space-y-4">
        <div className="px-1 py-1 bg-blue-100 dark:bg-blue-950 rounded-lg w-full">
            <TabsList className="grid w-full grid-cols-5 h-10 bg-transparent p-0">
                <TabsTrigger value="storage" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                    <Database className="h-4 w-4 mr-2" />
                    存储设置
                </TabsTrigger>
                <TabsTrigger value="ai" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                    <Brain className="h-4 w-4 mr-2" />
                    AI 配置
                </TabsTrigger>                
                <TabsTrigger value="categories" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                    <Layers className="h-4 w-4 mr-2" />
                    分类设置
                </TabsTrigger>
                <TabsTrigger value="regex" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                    <Code className="h-4 w-4 mr-2" />
                    全局正则
                </TabsTrigger>
                <TabsTrigger value="general" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 font-medium">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    通用
                </TabsTrigger>
            </TabsList>
        </div>

        {/* Storage Settings */}
        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>对象存储 (S3/R2)</CardTitle>
              <CardDescription>
                配置用于存储角色卡图片和文件的 S3 兼容存储服务。
                建议使用 Cloudflare R2 ,便宜大碗。
              </CardDescription>
            </CardHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData);
              handleSave("storage_config", data);
            }}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="s3_endpoint">服务端点地址</Label>
                  <Input 
                    id="s3_endpoint" 
                    name="s3_endpoint" 
                    defaultValue={storageConfig.s3_endpoint} 
                    placeholder="例如https://<账号ID>.r2.cloudflarestorage.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="s3_bucket">存储桶名称</Label>
                    <Input 
                      id="s3_bucket" 
                      name="s3_bucket" 
                      defaultValue={storageConfig.s3_bucket} 
                      placeholder="bucket name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="s3_region">区域</Label>
                    <Input 
                      id="s3_region" 
                      name="s3_region" 
                      defaultValue={storageConfig.s3_region} 
                      placeholder="auto"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="s3_access_key">Access Key ID</Label>
                    <Input 
                      id="s3_access_key" 
                      name="s3_access_key" 
                      type="password"
                      defaultValue={storageConfig.s3_access_key} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="s3_secret_key">Secret Access Key</Label>
                    <Input 
                      id="s3_secret_key" 
                      name="s3_secret_key" 
                      type="password"
                      defaultValue={storageConfig.s3_secret_key} 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s3_public_url">公开访问地址（选填但建议）</Label>
                  <Input 
                    id="s3_public_url" 
                    name="s3_public_url" 
                    defaultValue={storageConfig.s3_public_url} 
                    placeholder="https://pub-xxx.r2.dev"
                  />
                  <p className="text-xs text-muted-foreground mb-4">
                    如果配置了公开访问域名，图片将直接通过该域名加载。性能会更好。
                  </p>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-4">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存更改
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Category Settings */}
        <TabsContent value="categories">
           <CategorySettings />
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                 <CardTitle>AI 渠道管理</CardTitle>
                 <CardDescription>
                   配置多个 AI 服务提供商，每次只能启用一个渠道。
                 </CardDescription>
              </div>
              <Button size="sm" onClick={openAdd}>
                  <Plus className="mr-2 h-4 w-4" /> 添加渠道
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">

                <div className="space-y-3">
                    {aiChannels.length === 0 && !channelLoading && (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                            暂无 AI 渠道，请添加
                        </div>
                    )}
                    
                    {aiChannels.map(channel => (
                        <div key={channel.id} className={`flex items-center justify-between p-4 border rounded-lg ${channel.is_active ? "border-primary bg-primary/5" : "bg-card"}`}>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{channel.name}</h4>
                                    {channel.is_active && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">当前使用</span>}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                                    {channel.base_url}
                                </div>
                                {channel.model && (
                                    <div className="text-xs text-muted-foreground">
                                        模型: {channel.model}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleTestChannel(channel)}>
                                    <Zap className="h-3.5 w-3.5 mr-1" /> 测试
                                </Button>
                                <Switch 
                                    checked={channel.is_active}
                                    onCheckedChange={(c) => handleSetActive(channel.id, c)}
                                />
                                <Button variant="ghost" size="icon" onClick={() => openEdit(channel)}>
                                    <SettingsIcon className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteChannel(channel.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>

          {/* Channel Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                      <DialogTitle>{editingChannel ? "编辑渠道" : "添加渠道"}</DialogTitle>
                      <DialogDescription>
                          配置 OpenAI 兼容的 API 接口信息。
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                          <Label htmlFor="name">渠道名称</Label>
                          <Input 
                              id="name" 
                              value={channelForm.name}
                              onChange={e => setChannelForm({...channelForm, name: e.target.value})}
                              placeholder="例如: OpenAI, DeepSeek..."
                          />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="base_url">API Base URL</Label>
                          <Input 
                              id="base_url" 
                              value={channelForm.base_url}
                              onChange={e => setChannelForm({...channelForm, base_url: e.target.value})}
                              placeholder="https://api.openai.com/v1"
                          />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="api_key">API Key</Label>
                          <Input 
                              id="api_key" 
                              type="password"
                              value={channelForm.api_key}
                              onChange={e => setChannelForm({...channelForm, api_key: e.target.value})}
                              placeholder="sk-..."
                          />
                      </div>
                      <div className="grid gap-2">
                          <div className="flex justify-between items-center">
                              <Label htmlFor="model">默认模型</Label>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleFetchModels} disabled={fetchingModels}>
                                  {fetchingModels ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                  获取模型列表
                              </Button>
                          </div>
                          
                          <div className="relative">
                             <Input 
                                id="model" 
                                value={channelForm.model}
                                onChange={e => setChannelForm({...channelForm, model: e.target.value})}
                                placeholder="gemini-2.5-flash"
                                list="model-suggestions"
                             />
                             {fetchedModels.length > 0 && (
                                <datalist id="model-suggestions">
                                    {fetchedModels.map(m => <option key={m} value={m} />)}
                                </datalist>
                             )}
                          </div>
                      </div>

                      {/* Test Result Area */}
                      <div className="flex items-center justify-between border rounded p-3 bg-muted/20">
                          <div className="text-sm">
                              {testingChannel ? (
                                  <span className="flex items-center text-muted-foreground">
                                      <Loader2 className="h-3 w-3 animate-spin mr-2" /> 正在连接...
                                  </span>
                              ) : testResult ? (
                                  testResult.success ? (
                                      <span className="flex items-center text-green-600 font-medium">
                                          <Check className="h-4 w-4 mr-2" /> 连接成功 ({testResult.latency}ms)
                                      </span>
                                  ) : (
                                      <span className="flex items-center text-destructive font-medium">
                                          <X className="h-4 w-4 mr-2" /> 连接失败: {testResult.error}
                                      </span>
                                  )
                              ) : (
                                  <span className="text-muted-foreground">保存前建议先测试连接</span>
                              )}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleTestChannel()} disabled={testingChannel}>
                              测试连接
                          </Button>
                      </div>

                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                      <Button onClick={handleSaveChannel} disabled={saving}>
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          保存
                      </Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>通用设置</CardTitle>
              <CardDescription>
                调整应用界面和默认行为。
              </CardDescription>
            </CardHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData);
              handleSave("general_config", data);
            }}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="cards_per_page">每页显示卡片数</Label>
                  <Input 
                    id="cards_per_page" 
                    name="cards_per_page" 
                    type="number" 
                    defaultValue={generalConfig.cards_per_page} 
                    min={10} 
                    max={100}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trash_auto_delete_days">回收站自动清理 (天)</Label>
                  <Input 
                    id="trash_auto_delete_days" 
                    name="trash_auto_delete_days" 
                    type="number" 
                    defaultValue={generalConfig.trash_auto_delete_days} 
                    min={0}
                    placeholder="0 为不自动清理"
                  />
                  <p className="text-xs text-muted-foreground mb-4">
                    设置为 0 表示不自动清理。
                  </p>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-4">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存更改
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Regex Settings */}
        <TabsContent value="regex">
          <Card>
            <CardHeader>
              <CardTitle>全局正则替换</CardTitle>
              <CardDescription>
                这个是用在角色卡的聊天记录预览里的，建议上传常用预设中的正则。（可以不配置）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <RegexScriptViewer 
                  scripts={regexScripts} 
                  onSave={async (newScripts) => {
                    setRegexScripts(newScripts);
                    await handleSave("global_regex", newScripts);
                  }}
                  editable={true}
                  allowManualAdd={false}
               />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
