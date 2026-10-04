"use client";

import React, { useCallback, useRef } from "react";
import { addDays, daysInMonth, parseDate, todayLocal, type DateString } from "@/lib/dates";
import type { MonthHistoryDay, NutritionGoals } from "@/lib/domain";
import { fmt } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface MonthCalendarProps {
  month: string; // "YYYY-MM"
  selectedDate: DateString;
  days: Record<DateString, MonthHistoryDay>;
  goals?: NutritionGoals;
  onSelectDate: (date: DateString) => void;
  onOpenDay?: (date: DateString) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthCalendar({
  month,
  selectedDate,
  days,
  goals,
  onSelectDate,
  onOpenDay,
}: MonthCalendarProps) {
  const today = todayLocal();
  const calendarRef = useRef<HTMLDivElement>(null);

  const m = month.slice(0, 7);
  const firstOfMonth = `${m}-01`;
  const count = daysInMonth(firstOfMonth);

  // Monday-first leading empty cells
  const leadingDays = (parseDate(firstOfMonth).getDay() + 6) % 7;
  const cells: (DateString | null)[] = [
    ...Array(leadingDays).fill(null),
    ...Array.from({ length: count }, (_, i) => addDays(firstOfMonth, i)),
  ];
  while (cells.length % 7) cells.push(null);

  // Keyboard navigation within calendar
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let nextDate: DateString | null = null;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextDate = addDays(selectedDate, -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextDate = addDays(selectedDate, 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextDate = addDays(selectedDate, -7);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nextDate = addDays(selectedDate, 7);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (onOpenDay) {
          onOpenDay(selectedDate);
        }
        return;
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        nextDate = today;
      }

      if (nextDate) {
        onSelectDate(nextDate);
        const targetDate = nextDate;
        setTimeout(() => {
          const targetBtn = calendarRef.current?.querySelector<HTMLButtonElement>(`button[data-date="${targetDate}"]`);
          targetBtn?.focus();
        }, 10);
      }
    },
    [onSelectDate, onOpenDay, selectedDate, today]
  );

  return (
    <div
      ref={calendarRef}
      className="card overflow-hidden rounded-xl border border-line bg-surface"
      role="region"
      aria-label="Month Calendar"
    >
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-line bg-surface-1/40 text-center text-[11px] font-semibold uppercase tracking-wider text-fg-3">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2.5">
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-line/70">
        {cells.map((d, idx) => {
          if (!d) {
            return (
              <div
                key={`empty-${idx}`}
                className="aspect-square bg-surface-2/30 sm:aspect-[1.25/1] pointer-events-none"
                aria-hidden="true"
              />
            );
          }

          const dayData = days[d];
          const hasFood = dayData && dayData.entryCount > 0;
          const isSelected = d === selectedDate;
          const isCurrentDay = d === today;
          const isFuture = d > today;
          const dayNumber = Number(d.slice(8));

          const goalCals = goals?.calories ?? 0;
          const cals = dayData?.calories ?? 0;
          const diff = goalCals > 0 ? cals - goalCals : 0;

          // Target proximity indicator
          const isNearTarget = goalCals > 0 && hasFood && Math.abs(diff) <= 150;
          const isOverTarget = goalCals > 0 && hasFood && diff > 150;

          const ariaLabel = `${parseDate(d).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}${hasFood ? `, ${fmt.int(cals)} kcal logged across ${dayData.entryCount} entries` : ", no entries"}${
            isCurrentDay ? ", Today" : ""
          }${isSelected ? ", Selected" : ""}`;

          return (
            <button
              key={d}
              data-date={d}
              type="button"
              onClick={() => onSelectDate(d)}
              onKeyDown={handleKeyDown}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex aspect-square flex-col justify-between p-1.5 text-left transition-colors sm:aspect-[1.25/1] sm:p-2 focus-visible:outline-hidden",
                // Base background
                isSelected
                  ? "bg-surface-2 ring-2 ring-inset ring-fg shadow-xs z-10"
                  : "bg-surface hover:bg-surface-2/60",
                // Today styling
                isCurrentDay && !isSelected && "ring-1 ring-inset ring-accent/60 bg-accent-soft/10",
                // Future styling
                isFuture && "text-fg-3/60"
              )}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={cn(
                    "text-xs font-semibold tabular leading-none sm:text-sm",
                    isCurrentDay
                      ? "text-accent font-bold"
                      : isSelected
                      ? "text-fg font-bold"
                      : isFuture
                      ? "text-fg-3/60"
                      : "text-fg-2"
                  )}
                >
                  {dayNumber}
                </span>

                {/* Logged Indicator Dot */}
                {hasFood ? (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      isNearTarget
                        ? "bg-accent"
                        : isOverTarget
                        ? "bg-amber-400"
                        : "bg-fg-2"
                    )}
                    title={
                      isNearTarget
                        ? "Near target"
                        : isOverTarget
                        ? "Over target"
                        : "Food logged"
                    }
                  />
                ) : null}
              </div>

              {/* Calorie & Macro Info */}
              {hasFood ? (
                <div className="w-full min-w-0">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold tabular text-fg leading-tight truncate sm:text-xs">
                      {fmt.int(cals)}
                      <span className="hidden sm:inline font-normal text-fg-3 text-[10px] ml-0.5">kcal</span>
                    </span>
                  </div>

                  {/* Desktop Macro preview */}
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-fg-3 font-mono mt-0.5 tabular leading-none">
                    <span className="text-blue-400 font-medium">{fmt.g(dayData.protein)}P</span>
                  </div>
                </div>
              ) : (
                <div className="h-4" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-1/40 px-3.5 py-2.5 text-xs text-fg-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span>Near target</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-fg-2" />
            <span>Food logged</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs border border-accent" />
            <span>Today</span>
          </span>
        </div>

        <span className="hidden sm:inline text-[11px] font-mono text-fg-3">
          Use <kbd className="rounded border border-line bg-surface-2 px-1">←</kbd> <kbd className="rounded border border-line bg-surface-2 px-1">→</kbd> to navigate · <kbd className="rounded border border-line bg-surface-2 px-1">T</kbd> for Today
        </span>
      </footer>
    </div>
  );
}
