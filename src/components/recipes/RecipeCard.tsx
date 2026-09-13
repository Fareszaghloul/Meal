"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Users,
  Clock,
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  ExternalLink,
  Utensils,
} from "lucide-react";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { cn } from "@/lib/utils";

export interface RecipeCardData {
  id: string;
  name: string;
  description?: string | null;
  servings: number;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  imageUrl?: string | null;
  sourcePlatform?: string | null;
  sourceUrl?: string | null;
  isFavorite: boolean;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  tags?: string[];
}

interface RecipeCardProps {
  recipe: RecipeCardData;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function RecipeCard({ recipe, onDelete, onDuplicate }: RecipeCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(recipe.isFavorite);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const totalTime =
    (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  // Close menu on click outside or Escape
  React.useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);


  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFavoriting) return;
    setIsFavoriting(true);
    const prev = isFavorite;
    setIsFavorite(!prev);

    try {
      const res = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: "POST",
      });
      if (!res.ok) setIsFavorite(prev);
    } catch {
      setIsFavorite(prev);
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        if (onDuplicate) {
          onDuplicate(recipe.id);
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Duplicate failed:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (onDelete) {
          onDelete(recipe.id);
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <div>
        {/* Top Media / Thumbnail Bar */}
        <div className="relative h-44 w-full bg-[var(--background)] overflow-hidden flex items-center justify-center">
          {recipe.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[var(--text-secondary)] opacity-50">
              <Utensils className="w-10 h-10 stroke-1 mb-1" />
              <span className="text-xs font-medium">MealPrep</span>
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            className={cn(
              "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition shadow-xs",
              isFavorite
                ? "bg-[var(--status-over-target)] text-white"
                : "bg-[var(--surface)]/80 text-[var(--text-secondary)] hover:text-[var(--status-over-target)]"
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-transform",
                isFavorite && "fill-current scale-110"
              )}
            />
          </button>

          {/* Platform Source pill */}
          {recipe.sourcePlatform && recipe.sourcePlatform !== "Manual" && (
            <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-[var(--surface)]/90 text-[var(--text-primary)] border border-[var(--border)] text-[10px] font-medium tracking-wide">
              {recipe.sourcePlatform}
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/recipes/${recipe.id}`}
              className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] text-base leading-snug line-clamp-1 transition"
            >
              {recipe.name}
            </Link>

            {/* Context Menu Trigger */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                aria-label="Recipe actions"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div role="menu" className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl py-1 text-xs animate-in fade-in">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push(`/recipes/${recipe.id}/edit`);
                    }}
                    className="w-full flex items-center px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    <span>Edit</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={handleDuplicate}
                    className="w-full flex items-center px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={handleDelete}
                    className="w-full flex items-center px-3 py-2 text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    <span>Delete</span>
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Servings and Time meta */}
          <div className="flex items-center space-x-3 text-xs text-[var(--text-secondary)] mt-1.5 mb-3">
            <span className="flex items-center">
              <Users className="w-3.5 h-3.5 mr-1 text-[var(--text-secondary)] opacity-70" />
              {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
            </span>
            {totalTime > 0 && (
              <span className="flex items-center font-tabular">
                <Clock className="w-3.5 h-3.5 mr-1 text-[var(--text-secondary)] opacity-70" />
                {totalTime} min
              </span>
            )}
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]"
                >
                  #{tag}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="text-[10px] text-[var(--text-secondary)] self-center font-tabular">
                  +{recipe.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Nutrition Badges */}
      <div className="px-4 py-3 bg-[var(--background)]/60 border-t border-[var(--border)]">
        <div className="grid grid-cols-2 gap-1.5 text-center">
          <MacroBadge
            label="Calories"
            value={Math.round(recipe.caloriesPerServing)}
            unit="kcal"
            type="calories"
            size="sm"
          />
          <MacroBadge
            label="Protein"
            value={Math.round(recipe.proteinPerServing)}
            unit="g"
            type="protein"
            size="sm"
          />
          <MacroBadge
            label="Carbs"
            value={Math.round(recipe.carbsPerServing)}
            unit="g"
            type="carbs"
            size="sm"
          />
          <MacroBadge
            label="Fat"
            value={Math.round(recipe.fatPerServing)}
            unit="g"
            type="fat"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
