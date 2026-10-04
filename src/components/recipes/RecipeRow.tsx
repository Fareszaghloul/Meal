"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, MoreVertical, Plus, Pencil, Copy, Trash2 } from "lucide-react";
import type { RecipeSummary } from "@/lib/domain";
import { fmt } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface RecipeRowProps {
  recipe: RecipeSummary;
  onSelect?: (recipe: RecipeSummary) => void;
  onLog?: (recipe: RecipeSummary) => void;
  onDuplicate?: (recipe: RecipeSummary) => void;
  onDelete?: (recipe: RecipeSummary) => void;
  onToggleFavorite?: (id: string, currentFav: boolean) => void;
  isHighlighted?: boolean;
}

export function RecipeRow({
  recipe,
  onSelect,
  onLog,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  isHighlighted,
}: RecipeRowProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
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

  const servingLabel = recipe.servingLabel?.trim() || (recipe.servings === 1 ? "serving" : "servings");
  const caloriesPer100g =
    recipe.yieldWeightGrams && recipe.yieldWeightGrams > 0
      ? Math.round(((recipe.caloriesPerServing * recipe.servings) / recipe.yieldWeightGrams) * 100)
      : null;

  const handleClick = () => {
    if (onSelect) {
      onSelect(recipe);
    } else {
      router.push(`/recipes/${recipe.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex items-center justify-between gap-3 px-3.5 py-3 transition-colors cursor-pointer hover:bg-surface-2/60",
        isHighlighted && "bg-surface-2"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Left Column: Recipe Information */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-fg tracking-tight group-hover:text-[var(--accent)] transition-colors">
            {recipe.name}
          </span>
          {recipe.yieldWeightGrams ? (
            <span className="shrink-0 text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.2 rounded bg-surface-3 text-fg-3">
              Batch
            </span>
          ) : null}
        </div>

        {/* Dense Subtitle Line */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-3">
          <span className="text-fg-2 tabular font-medium">
            {recipe.servings} {servingLabel} · {fmt.int(recipe.caloriesPerServing)} kcal
          </span>
          {caloriesPer100g !== null && (
            <>
              <span className="text-fg-4 select-none">·</span>
              <span className="tabular text-fg-3">{caloriesPer100g} kcal/100g</span>
            </>
          )}
          <span className="text-fg-4 select-none">·</span>
          <span className="tabular font-medium text-fg-2">{fmt.g(recipe.proteinPerServing)}P</span>
          <span className="text-fg-4 select-none">·</span>
          <span className="tabular font-medium text-fg-2">{fmt.g(recipe.carbsPerServing)}C</span>
          <span className="text-fg-4 select-none">·</span>
          <span className="tabular font-medium text-fg-2">{fmt.g(recipe.fatPerServing)}F</span>
        </div>
      </div>

      {/* Right Column: Calories, Favorite & Action Menu */}
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Total Calories per serving display */}
        <div className="text-right hidden sm:block">
          <span className="text-sm font-bold tabular text-fg">
            {fmt.int(recipe.caloriesPerServing)}
          </span>
          <span className="ml-1 text-xs text-fg-3">kcal</span>
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(recipe.id, recipe.isFavorite);
            }}
            className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-fg"
            aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-transform",
                recipe.isFavorite ? "fill-[var(--accent)] text-[var(--accent)] scale-105" : "text-fg-3 hover:text-fg"
              )}
            />
          </button>
        )}

        {/* Quick Log Button */}
        {onLog && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLog(recipe);
            }}
            className="btn btn-secondary btn-icon btn-sm h-8 w-8 text-fg-2 hover:bg-[var(--accent)] hover:text-[var(--on-accent)] hover:border-transparent transition-colors"
            title="Log this recipe"
            aria-label={`Log ${recipe.name}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* Actions Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-fg"
            aria-label="More recipe options"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl bg-surface-2 border border-line/60 shadow-xl py-1 text-xs animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {onLog && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLog(recipe);
                  }}
                  className="w-full flex items-center px-3 py-2 text-fg hover:bg-surface-3 transition-colors text-left"
                >
                  <Plus className="h-3.5 w-3.5 mr-2 text-[var(--accent)]" />
                  <span>Log recipe</span>
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push(`/recipes/${recipe.id}/edit`);
                }}
                className="w-full flex items-center px-3 py-2 text-fg hover:bg-surface-3 transition-colors text-left"
              >
                <Pencil className="h-3.5 w-3.5 mr-2 text-fg-3" />
                <span>Edit recipe</span>
              </button>

              {onDuplicate && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDuplicate(recipe);
                  }}
                  className="w-full flex items-center px-3 py-2 text-fg hover:bg-surface-3 transition-colors text-left"
                >
                  <Copy className="h-3.5 w-3.5 mr-2 text-fg-3" />
                  <span>Duplicate</span>
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(recipe);
                  }}
                  className="w-full flex items-center px-3 py-2 text-[var(--status-over-target)] hover:bg-surface-3 transition-colors text-left border-t border-line/40 mt-1"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  <span>Delete recipe</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
