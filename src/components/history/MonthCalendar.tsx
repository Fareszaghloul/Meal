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
    <div ref={calendarRef} className="card px-2 pb-3 pt-4 sm:px-4" role="region" aria-label="Month Calendar">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 pb-1.5 text-center text-xs font-semibold text-fg-3">
        {WEEKDAYS.map((w) => (
          <div key={w}>
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden" aria-hidden="true">
              {w[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Days: each day is a ring showing how close it came to the calorie goal */}
      <div className="grid grid-cols-7 justify-items-center gap-y-0.5">
        {cells.map((d, idx) => {
          if (!d) return <div key={`empty-${idx}`} className="h-12" aria-hidden="true" />;

          const dayData = days[d];
          const hasFood = Boolean(dayData && dayData.entryCount > 0);
          const isSelected = d === selectedDate;
          const isCurrentDay = d === today;
          const isFuture = d > today;
          const dayNumber = Number(d.slice(8));

          const goalCals = goals?.calories ?? 0;
          const cals = dayData?.calories ?? 0;
          const pct = goalCals > 0 ? (cals / goalCals) * 100 : hasFood ? 100 : 0;
          const isOver = goalCals > 0 && hasFood && pct > 105;
          const isNearTarget = goalCals > 0 && hasFood && pct >= 90 && !isOver;
          const ringColor = isSelected ? "var(--on-accent)" : isOver ? "var(--carbs)" : isNearTarget ? "var(--accent)" : "var(--fg-3)";
          const dash = `${(Math.min(100, pct) / 100) * 100.53} 100.53`;

          const ariaLabel = `${parseDate(d).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}${hasFood ? `, ${fmt.int(cals)} kcal logged across ${dayData!.entryCount} entries` : ", no entries"}${
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
              className="flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-fg"
            >
              <span className={cn("relative flex h-10 w-10 items-center justify-center rounded-full transition-colors", isSelected ? "bg-accent" : "hover:bg-surface-2")}>
                <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 h-10 w-10 -rotate-90">
                  {hasFood && <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" stroke={isSelected ? "rgba(0,0,0,0.18)" : "var(--surface-2)"} />}
                  {hasFood && <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" strokeLinecap="round" stroke={ringColor} strokeDasharray={dash} />}
                </svg>
                <span
                  className={cn(
                    "tabular relative text-sm",
                    isSelected ? "font-bold text-on-accent" : isCurrentDay ? "font-bold text-fg underline decoration-2 underline-offset-4" : isFuture ? "font-medium text-fg-3" : "font-medium text-fg"
                  )}
                >
                  {dayNumber}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <footer className="flex flex-wrap items-center justify-between gap-3 px-2 pt-3 text-xs text-fg-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span>Near target</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-carbs" />
            <span>Over</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-fg-3" />
            <span>Under</span>
          </span>
        </div>

        <span className="hidden font-mono text-[11px] text-fg-3 sm:inline">
          Use <kbd className="rounded border border-line bg-surface-2 px-1">←</kbd> <kbd className="rounded border border-line bg-surface-2 px-1">→</kbd> to navigate · <kbd className="rounded border border-line bg-surface-2 px-1">T</kbd> for Today
        </span>
      </footer>
    </div>
  );
}
