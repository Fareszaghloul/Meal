"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  Utensils,
} from "lucide-react";
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
  index?: number;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

const TINTS = [
  "bg-[var(--accent-subtle)] text-[var(--lime)]",
  "bg-[var(--macro-protein-bg)] text-[var(--macro-protein)]",
  "bg-[var(--macro-carbs-bg)] text-[var(--macro-carbs)]",
  "bg-[var(--macro-fat-bg)] text-[var(--macro-fat)]",
];

export function RecipeCard({ recipe, index = 0, onDelete, onDuplicate }: RecipeCardProps) {
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

  const tintClass = TINTS[index % TINTS.length];

  return (
    <div className="group relative rounded-3xl bg-[var(--surface)] shadow-none flex flex-col justify-between overflow-hidden transition-transform duration-200 hover:-translate-y-1">
      <div>
        {/* Top Media / Thumbnail Bar */}
        <div className={cn("relative h-44 w-full overflow-hidden flex items-center justify-center", !recipe.imageUrl && tintClass)}>
          {recipe.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                loading="lazy"
                decoding="async"
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center opacity-70">
              <Utensils className="w-10 h-10 stroke-1 mb-1" />
              <span className="text-[11px] font-semibold tracking-wider uppercase">MealPrep</span>
            </div>
          )}

          {/* Round Favorite Button Top-Right */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={cn(
              "absolute top-3.5 right-3.5 w-9 h-9 rounded-full backdrop-blur-md transition flex items-center justify-center cursor-pointer",
              isFavorite
                ? "bg-[var(--surface)] text-[var(--status-over-target)]"
                : "bg-[var(--surface)]/70 text-[var(--text-secondary)] hover:text-[var(--status-over-target)]"
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-transform",
                isFavorite && "fill-current scale-110"
              )}
            />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5">
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                aria-label="Recipe actions"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                className="tap-target inline-flex items-center justify-center p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div role="menu" className="absolute right-0 top-8 z-20 w-36 rounded-2xl bg-[var(--surface)] shadow-2xl py-1 text-xs animate-in fade-in">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push(`/recipes/${recipe.id}/edit`);
                    }}
                    className="w-full flex items-center px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    <span>Edit</span>
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleDuplicate}
                    className="w-full flex items-center px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleDelete}
                    className="w-full flex items-center px-3.5 py-2 text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* servings · min */}
          <div className="text-xs text-[var(--text-muted)] font-tabular mt-1">
            {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
            {totalTime > 0 ? ` · ${totalTime} min` : ""}
          </div>
        </div>
      </div>

      {/* Card Footer with 1px divider: kcal and "P · C · F" */}
      <div className="px-5 py-3.5 border-t border-[var(--border)] flex items-center justify-between text-xs font-tabular">
        <span className="font-bold text-[var(--text-primary)]">
          {Math.round(recipe.caloriesPerServing)} kcal
        </span>
        <span className="text-[var(--text-muted)]">
          {Math.round(recipe.proteinPerServing)}g P · {Math.round(recipe.carbsPerServing)}g C · {Math.round(recipe.fatPerServing)}g F
        </span>
      </div>
    </div>
  );
}
