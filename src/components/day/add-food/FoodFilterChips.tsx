"use client";

import React from "react";
import type { FoodFilterType } from "./types";
import { cn } from "@/lib/utils";

interface FoodFilterChipsProps {
  activeFilter: FoodFilterType;
  onFilterChange: (filter: FoodFilterType) => void;
  counts?: Partial<Record<FoodFilterType, number>>;
}

const FILTERS: { id: FoodFilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
  { id: "favorites", label: "Favorites" },
  { id: "mine", label: "My Foods" },
  { id: "recipes", label: "Recipes" },
  { id: "restaurants", label: "Restaurants" },
  { id: "online", label: "Online" },
];

export function FoodFilterChips({
  activeFilter,
  onFilterChange,
  counts,
}: FoodFilterChipsProps) {
  return (
    <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-1 no-scrollbar text-xs">
      {FILTERS.map((f) => {
        const isSelected = activeFilter === f.id;
        const count = counts?.[f.id];

        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all duration-150",
              isSelected
                ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-sm"
                : "bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg font-normal"
            )}
            aria-pressed={isSelected}
          >
            {f.label}
            {typeof count === "number" && count > 0 && (
              <span
                className={cn(
                  "ml-1.5 text-[10px] tabular",
                  isSelected ? "opacity-90" : "text-fg-3"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
