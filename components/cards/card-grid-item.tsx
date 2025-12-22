"use client";

import { Badge } from "@/components/ui/badge";
import { Star, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, memo } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface CardItemProps {
  card: {
    id: string;
    name: string;
    storage_path?: string;
    thumbnail_path?: string;
    user_rating?: number;
    is_nsfw?: boolean;
    is_favorite?: boolean;
    tags?: Array<{ id: string; name: string; }>;
    [key: string]: unknown;
  };
  viewMode?: "grid" | "list";
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export const CardGridItem = memo(function CardGridItem({ card, viewMode = "grid", isSelectionMode, isSelected, onSelect }: CardItemProps) {
  const [isNsfw, setIsNsfw] = useState(card.is_nsfw);
  const [isUpdating, setIsUpdating] = useState(false);

  let imageUrl = "/docs/default.jpg";
  if (card.storage_path) {
    if (card.storage_path.startsWith("http")) {
      imageUrl = card.storage_path;
    } else {
       // Prefer thumbnail (WebP) if available, otherwise fallback to original
       // If thumbnail_path is null (e.g. old cards), use storage_path
       const path = card.thumbnail_path || card.storage_path;
       imageUrl = `/api/images/${path}`;
    }
  }

  // Handle rating display
  const rating = card.user_rating || 0;

  const toggleNsfw = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();

    if (isUpdating) return;
    
    const newVal = !isNsfw;
    setIsNsfw(newVal); // Optimistic update
    setIsUpdating(true);

    try {
        const res = await fetch(`/api/cards/${card.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_nsfw: newVal })
        });

        if (!res.ok) {
            throw new Error("Update failed");
        }
    } catch (error) {
        setIsNsfw(!newVal); // Revert
        toast.error("状态更新失败");
    } finally {
        setIsUpdating(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode && onSelect) {
      e.preventDefault();
      onSelect(card.id, !isSelected);
    }
  };
  
  if (viewMode === "list") {
    return (
      <Link 
        href={isSelectionMode ? "#" : `/cards/${card.id}`} 
        onClick={handleCardClick}
        prefetch={false}
        className="group block relative w-full"
      >
        <div className={cn(
          "flex items-center gap-4 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
          isSelected && "bg-accent"
        )}>
          {/* List View Image - Small thumbnail */}
          <div className={cn(
             "relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted transition-all",
             isSelected && "ring-2 ring-inset ring-primary ring-opacity-100 border-primary"
           )}>
            <img 
              src={imageUrl} 
              alt={card.name} 
              loading="lazy"
              decoding="async"
              className={cn(
                "h-full w-full object-cover",
                isNsfw && "blur-sm scale-110"
              )}
              onError={(e) => {
                e.currentTarget.src = "/docs/default.jpg";
              }}
            />
             {isSelectionMode && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                   <Checkbox 
                      checked={isSelected} 
                      className="h-4 w-4 border-primary/80"
                      onCheckedChange={(checked) => onSelect && onSelect(card.id, checked as boolean)}
                    />
                </div>
             )}
          </div>

          {/* List View Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
             <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{card.name}</h3>
                {card.is_favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
                {rating > 0 && (
                    <span className="flex items-center text-[10px] text-muted-foreground bg-muted px-1 rounded">
                        {Number(rating).toFixed(1)} <Star className="h-2 w-2 ml-0.5 fill-muted-foreground" />
                    </span>
                )}
             </div>
             <div className="flex gap-1 overflow-hidden h-4">
                {card.tags?.slice(0, 5).map((tag) => (
                    <span key={tag.id} className="text-[10px] text-muted-foreground bg-secondary px-1 rounded-sm whitespace-nowrap">
                        {tag.name}
                    </span>
                ))}
             </div>
          </div>

          {/* List View Actions */}
          {!isSelectionMode && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                  <button
                    onClick={toggleNsfw}
                    className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground"
                    title={isNsfw ? "显示图片" : "模糊图片"}
                  >
                    {isNsfw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
              </div>
          )}
        </div>
      </Link>
    );
  }

  // Grid View (Default)
  return (
    <Link 
      href={isSelectionMode ? "#" : `/cards/${card.id}`} 
      onClick={handleCardClick}
      prefetch={false}
      className={cn(
        "group block relative h-full w-full p-2", // More padding to ensure outer ring is fully visible
        isSelectionMode && "cursor-pointer"
      )}
    >
      <div className={cn(
        "relative rounded-xl",
        isSelected && "ring-[3px] ring-primary ring-offset-2 ring-offset-background"
      )}>
        <div className={cn(
          "relative aspect-[2/3] w-full overflow-hidden rounded-xl border bg-muted shadow-sm hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]"
        )}>
        
        {/* Full Cover Image */}
        <img 
          src={imageUrl} 
          alt={card.name} 
          loading="lazy"
          decoding="async"
          className={cn(
            "h-full w-full object-cover transition-transform duration-700 group-hover:scale-110",
            isNsfw && "blur-xl scale-110",
            isSelected && "opacity-80"
          )}
          onError={(e) => {
            e.currentTarget.src = "/docs/default.jpg";
            e.currentTarget.className = "h-full w-full object-cover";
          }}
        />

        {/* Gradient Overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90",
          isNsfw && "from-black/95 via-black/60",
          isSelected && "bg-black/20"
        )} />
        
        {/* Selection Checkbox - Reverted to Top Right */}
        {isSelectionMode && (
          <div className="absolute top-2 right-2 z-20">
             {/* Using a cleaner circular style without extra wrapper borders */}
             <div className="shadow-sm transition-transform active:scale-95">
                <Checkbox 
                  checked={isSelected} 
                  className="h-6 w-6 rounded-full border-2 border-white/80 bg-black/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md"
                  onCheckedChange={(checked) => onSelect && onSelect(card.id, checked as boolean)}
                />
             </div>
             {/* Larger click area for easier mobile tap */}
             <div 
                className="absolute -inset-2 cursor-pointer" 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect && onSelect(card.id, !isSelected);
                }} 
             />
          </div>
        )}

        {/* Top Badges */}
        {!isSelectionMode && (
          <div className="absolute top-2 right-2 flex gap-1 z-10">
             {/* Eye Toggle Button */}
             <button
               onClick={toggleNsfw}
               className="rounded-full bg-black/40 backdrop-blur-md p-1.5 border border-white/10 shadow-sm hover:bg-black/60 transition-colors group/eye"
               title={isNsfw ? "显示图片" : "模糊图片"}
             >
               {isNsfw ? (
                  <EyeOff className="h-3.5 w-3.5 text-white/70 group-hover/eye:text-white" />
               ) : (
                  <Eye className="h-3.5 w-3.5 text-white/70 group-hover/eye:text-white" />
               )}
             </button>

             {card.is_favorite && (
                <div className="rounded-full bg-black/40 backdrop-blur-md p-1.5 border border-white/10 shadow-sm">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                </div>
             )}
          </div>
        )}

        {/* Bottom Content - Overlay Style */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10 flex flex-col gap-1.5">
          {/* Title & Rating */}
          <div className="flex justify-between items-end gap-2">
            <h3 className="font-bold text-base leading-snug line-clamp-2 text-white drop-shadow-sm group-hover:text-blue-200 transition-colors" title={card.name}>
              {card.name}
            </h3>
            {rating > 0 && (
                <div className="flex items-center gap-1 shrink-0 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-medium border border-white/10">
                  <span className="text-white">{Number(rating).toFixed(1)}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
            )}
          </div>

          {/* Tags - Semi-hidden until hover or if space permits */}
          <div className="flex flex-wrap gap-1.5 pt-1 opacity-90 group-hover:opacity-100 transition-opacity">
              {card.tags && card.tags.length > 0 ? (
                <>
                  {card.tags.slice(0, 3).map((tag) => (
                    <Badge 
                      key={tag.id} 
                      variant="secondary" 
                      className="px-1.5 py-0 text-[10px] h-5 font-normal bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {card.tags.length > 3 && (
                     <span className="text-[10px] text-white/70 flex items-center h-5">+{card.tags.length - 3}</span>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-white/50">无标签</span>
              )}
          </div>
        </div>
      </div>
      </div>
    </Link>
  );
}, (prev, next) => {
  return (
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isSelected === next.isSelected &&
    prev.viewMode === next.viewMode &&
    prev.onSelect === next.onSelect &&
    // Shallow compare card essential props to avoid expensive JSON.stringify on huge data blobs
    prev.card.id === next.card.id &&
    prev.card.name === next.card.name &&
    prev.card.storage_path === next.card.storage_path &&
    prev.card.thumbnail_path === next.card.thumbnail_path &&
    prev.card.is_nsfw === next.card.is_nsfw &&
    prev.card.is_favorite === next.card.is_favorite &&
    prev.card.user_rating === next.card.user_rating &&
    // For tags, just compare length and first item ID for speed, or strict ref check
    // Since tags are usually small, we can check a bit more if needed, but ref check might be enough if immutable
    // Let's do a quick length + id check
    (prev.card.tags?.length || 0) === (next.card.tags?.length || 0) &&
    (prev.card.tags?.[0]?.id === next.card.tags?.[0]?.id)
  );
});
