"use client";

import React, { forwardRef, useEffect } from "react";
import { Search, X, Sparkles } from "lucide-react";
import type { ParsedNaturalSearch } from "@/lib/nutrition/natural-parser";
import { cn } from "@/lib/utils";

interface FoodSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  parsedNatural: ParsedNaturalSearch;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
}

export const FoodSearchBar = forwardRef<HTMLInputElement, FoodSearchBarProps>(
  function FoodSearchBar({ value, onChange, parsedNatural, onKeyDown, isLoading }, ref) {
    return (
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" />
          <input
            ref={ref}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search foods, meals, restaurants..."
            className="input h-11 w-full pl-10 pr-20 text-[15px] placeholder:text-fg-3 border-line focus:border-fg-2 transition-colors rounded-lg bg-surface-2/60"
            autoComplete="off"
            autoFocus
            aria-label="Search foods, meals, restaurants"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-[var(--accent)]" />
            )}
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-fg"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-line bg-surface px-1.5 text-[11px] font-medium text-fg-3">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Natural quantity feedback badge */}
        {parsedNatural.hasNaturalQuantity && (
          <div className="flex items-center gap-1.5 px-1 text-xs text-fg-2">
            <span className="inline-flex items-center gap-1 rounded bg-[var(--accent-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              <Sparkles className="h-3 w-3" />
              {parsedNatural.quantity}
              {parsedNatural.unit ? ` ${parsedNatural.unit}` : ""} pre-set
            </span>
            <span className="text-fg-3 truncate">
              Searching for &ldquo;{parsedNatural.foodQuery}&rdquo;
            </span>
          </div>
        )}
      </div>
    );
  }
);
