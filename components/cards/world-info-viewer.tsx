"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Book, Key, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface WorldInfoEntry {
  id: number;
  keys: string[];
  secondary_keys?: string[];
  comment?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  enabled?: boolean;
  position?: string;
  extensions?: any;
}

interface CharacterBook {
  name?: string;
  description?: string;
  entries: WorldInfoEntry[];
}

export function WorldInfoViewer({ data }: { data?: CharacterBook }) {
  // Local state for translations: { entryId: translatedText }
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [loadingTranslation, setLoadingTranslation] = useState<Record<number, boolean>>({});
  const [targetLang, setTargetLang] = useState("Simplified Chinese");

  const [displayCount, setDisplayCount] = useState(20);
  const LOAD_INCREMENT = 20;

  if (!data || !data.entries || data.entries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        无设定集数据 (World Info)
      </div>
    );
  }

  const enabledEntries = data.entries.filter(e => e.enabled !== false);
  const totalEntries = data.entries.length;
  
  // Use simple pagination/load more to avoid rendering thousands of items
  const visibleEntries = data.entries.slice(0, displayCount);
  const hasMore = displayCount < totalEntries;

  const handleTranslate = async (entry: WorldInfoEntry) => {
    if (!entry.content) return;
    
    setLoadingTranslation(prev => ({ ...prev, [entry.id]: true }));
    try {
        const res = await fetch("/api/ai/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: entry.content,
                target_lang: targetLang
            })
        });

        const json = await res.json();
        
        if (json.success) {
            setTranslations(prev => ({ ...prev, [entry.id]: json.data }));
            console.log("Translation Prompt Used:", json.prompt);
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
        setLoadingTranslation(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
            设定集: {data.name || "未命名"}
            </h3>
            <Badge variant="outline" className="ml-2">
            {enabledEntries.length} 启用 / {data.entries.length} 总计
            </Badge>
        </div>
        
        <div className="flex items-center gap-2">
           <span className="text-xs text-muted-foreground">翻译目标: 简体中文</span>
        </div>
      </div>

      <Accordion type="multiple" className="w-full space-y-4">
        {visibleEntries.map((entry) => {
          const isEnabled = entry.enabled !== false;
          const translated = translations[entry.id];
          const isLoading = loadingTranslation[entry.id];
          
          return (
            <AccordionItem 
              key={entry.id} 
              value={`entry-${entry.id}`} 
              className={`border rounded-lg px-4 bg-card ${!isEnabled ? "opacity-70 bg-muted/30" : ""}`}
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex flex-col items-start text-left gap-2 w-full pr-4">
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <span className="font-medium text-sm">
                      {entry.comment || `条目 #${entry.id}`}
                    </span>
                    {!isEnabled && <Badge variant="destructive" className="text-[10px] h-5">禁用</Badge>}
                    {entry.constant && <Badge variant="secondary" className="text-[10px] h-5">常驻</Badge>}
                    {entry.selective && <Badge variant="outline" className="text-[10px] h-5">选择性</Badge>}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                    <span>ID: {entry.id}</span>
                    <span className="w-px h-3 bg-border"></span>
                    <span>插入: {entry.position || "默认"}</span>
                  </div>

                  {entry.keys.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full">
                      <Key className="h-3 w-3 shrink-0" />
                      <span className="truncate">{entry.keys.join(", ")}</span>
                    </div>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-4">
                <div className="bg-muted/50 rounded-md p-3 text-sm font-mono whitespace-pre-wrap leading-relaxed border relative group">
                  {entry.content}
                  
                  {/* Translate Button */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-6 px-2 text-[10px]" 
                        onClick={() => handleTranslate(entry)}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3 mr-1" />}
                        翻译
                      </Button>
                  </div>
                </div>

                {/* Translation Result */}
                {translated && (
                    <div className="bg-primary/5 rounded-md p-3 text-sm leading-relaxed border border-primary/20 relative animate-in fade-in slide-in-from-top-2">
                        <div className="absolute top-0 right-0 px-2 py-1 bg-primary text-primary-foreground text-[10px] rounded-bl-md rounded-tr-md">
                            AI 翻译 ({targetLang})
                        </div>
                        <div className="whitespace-pre-wrap pt-2">
                            {translated}
                        </div>
                    </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      
      {hasMore && (
        <div className="flex justify-center pt-4">
            <Button 
                variant="outline" 
                onClick={() => setDisplayCount(prev => prev + LOAD_INCREMENT)}
                className="w-full sm:w-auto"
            >
                加载更多 ({totalEntries - displayCount} 剩余)
            </Button>
        </div>
      )}
    </div>
  );
}
