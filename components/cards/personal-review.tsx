
"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Edit2, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PersonalReviewProps {
  cardId: string;
  onScoreUpdate?: (newRating?: number) => void;
}

const DIMENSIONS = [
  { key: "rating_plot", label: "剧情" },
  { key: "rating_logic", label: "逻辑" },
  { key: "rating_worldview", label: "世界观" },
  { key: "rating_formatting", label: "美化" },
  { key: "rating_playability", label: "可玩性" },
  { key: "rating_human", label: "活人感" },
  { key: "rating_first_message", label: "开场白" },
];

export function PersonalReview({ cardId, onScoreUpdate }: PersonalReviewProps) {
  const { data: swrData, mutate } = useSWR(
    `/api/cards/${cardId}/review`,
    fetcher
  );
  const review = swrData?.success ? swrData.data : null;
  const loading = !swrData && !review;

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({
    rating_plot: 0,
    rating_logic: 0,
    rating_worldview: 0,
    rating_formatting: 0,
    rating_playability: 0,
    rating_human: 0,
    rating_first_message: 0,
    mood: "neutral",
    best_model: "",
    best_preset: "",
    notes: "",
  });

  useEffect(() => {
    if (review) {
      setFormData(review);
    } else if (swrData && !swrData.data) {
       // Loaded but no review
       // Only auto-open edit if not loading and truly no review
       if (!loading) setIsEditing(true);
    }
  }, [review, swrData, loading]);

  // Removed fetchReview since SWR handles it

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        mutate(); // Revalidate
        setIsEditing(false);
        toast.success("评价已保存");
        // Pass the new calculated rating from server to parent
        onScoreUpdate?.(result.data.new_total_rating);
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这条评价吗？")) return;
    try {
      await fetch(`/api/cards/${cardId}/review`, { method: "DELETE" });
      mutate(); // Revalidate (should become null)
      setFormData({ // Reset form
        rating_plot: 0,
        rating_logic: 0,
        rating_worldview: 0,
        rating_formatting: 0,
        rating_playability: 0,
        rating_human: 0,
        rating_first_message: 0,
        mood: "neutral",
        best_model: "",
        best_preset: "",
        notes: "",
      });
      setIsEditing(true);
      toast.success("已删除");
      onScoreUpdate?.(0); // Trigger update with 0 rating
    } catch (error) {
      toast.error("删除失败");
    }
  };

  // Helper to render stars
  const StarRating = ({ value, onChange, readOnly = false }: { value: number, onChange?: (v: number) => void, readOnly?: boolean }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-5 w-5 transition-colors",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110",
              star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
            )}
            onClick={() => !readOnly && onChange?.(star === value ? 0 : star)} // Toggle off if clicking same
          />
        ))}
      </div>
    );
  };

  // Calculate Chart Data
  const chartData = DIMENSIONS.map(d => ({
    subject: d.label,
    A: review ? review[d.key] || 0 : formData[d.key] || 0,
    fullMark: 5,
  }));

  // Calculate Total Score
  const calculateScore = (data: any) => {
    const scores = DIMENSIONS.map(d => data[d.key] || 0).filter(v => v > 0);
    if (scores.length === 0) return "-";
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">加载评价中...</div>;

  // VIEW MODE
  if (review && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              综合评分: <span className="text-2xl text-yellow-500">{calculateScore(review)}</span>
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            </h3>
            <div className="flex gap-2 mt-2">
              {review.mood && (
                <Badge variant="outline" className={cn(
                  "px-2 py-1",
                  review.mood === 'fire' && "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20",
                  review.mood === 'sleepy' && "border-blue-400 text-blue-500 bg-blue-50 dark:bg-blue-950/20",
                )}>
                  {review.mood === 'fire' ? '🔥 火热' : review.mood === 'sleepy' ? '💤 无聊' : '😐 一般'}
                </Badge>
              )}
              {review.best_model && <Badge variant="secondary">{review.best_model}</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" /> 编辑
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Radar Chart */}
          <div className="h-[300px] w-full flex items-center justify-center bg-card rounded-lg border p-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                <Radar
                  name="评分"
                  dataKey="A"
                  stroke="#eab308"
                  fill="#eab308"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div className="space-y-3">
              {DIMENSIONS.map(d => (
                <div key={d.key} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">{d.label}</span>
                  <StarRating value={review[d.key] || 0} readOnly />
                </div>
              ))}
            </div>
            
            {(review.best_preset || review.notes) && (
              <div className="space-y-4 pt-4 border-t">
                {review.best_preset && (
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">最佳预设</span>
                    <p className="text-sm">{review.best_preset}</p>
                  </div>
                )}
                {review.notes && (
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">备注</span>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed mt-1">{review.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">编辑个人评价</h3>
        {review && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            <X className="h-4 w-4 mr-2" /> 取消
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {DIMENSIONS.map(d => (
            <div key={d.key} className="flex justify-between items-center">
              <Label>{d.label}</Label>
              <StarRating 
                value={formData[d.key] || 0} 
                onChange={(v) => setFormData({ ...formData, [d.key]: v })} 
              />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>体验</Label>
              <Select 
                value={formData.mood} 
                onValueChange={(v) => setFormData({ ...formData, mood: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fire">🔥 火热</SelectItem>
                  <SelectItem value="neutral">😐 一般</SelectItem>
                  <SelectItem value="sleepy">💤 无聊</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>最佳模型</Label>
              <Select 
                value={formData.best_model} 
                onValueChange={(v) => setFormData({ ...formData, best_model: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="gpt">GPT</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>最佳预设</Label>
            <Input 
              value={formData.best_preset || ""} 
              onChange={(e) => setFormData({ ...formData, best_preset: e.target.value })}
              placeholder="例如：破限+CoT"
            />
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea 
              value={formData.notes || ""} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="详细记录你的使用体验..."
              className="min-h-[150px]"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "保存中..." : "保存评价"}
        </Button>
      </div>
    </div>
  );
}
