import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateCardRating(review: any): number | null {
  if (!review) return null;
  
  const ratings = [
    review.rating_plot,
    review.rating_logic,
    review.rating_worldview,
    review.rating_formatting,
    review.rating_playability,
    review.rating_human,
    review.rating_first_message,
  ].map(r => Number(r) || 0).filter(r => r > 0);

  if (ratings.length === 0) return null;

  // Calculate average and fix to 1 decimal place
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Number(avg.toFixed(1));
}
