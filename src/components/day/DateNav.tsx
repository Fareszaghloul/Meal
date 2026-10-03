"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, History, ArrowRight } from "lucide-react";
import { addDays, formatDate, todayLocal, diffDays, type DateString } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface DateNavProps {
  date: DateString;
  onChange: (d: DateString) => void;
}

export function DateNav({ date, onChange }: DateNavProps) {
  const today = todayLocal();
  const inputRef = useRef<HTMLInputElement>(null);
  const isCurrentDay = date === today;
  const dayDifference = diffDays(today, date);
  const isHistorical = dayDifference < 0;
  const isFuture = dayDifference > 0;

  const dayName = isCurrentDay
    ? "Today"
    : dayDifference === -1
    ? "Yesterday"
    : dayDifference === 1
    ? "Tomorrow"
    : formatDate(date, { weekday: "short" });

  const formattedDate = formatDate(date, {
    month: "short",
    day: "numeric",
    year: date.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-lg border border-line bg-surface p-0.5 shadow-xs">
        {/* Previous day */}
        <button
          type="button"
          onClick={() => onChange(addDays(date, -1))}
          className="btn btn-ghost btn-icon btn-sm h-8 w-8 text-fg-2 hover:text-fg"
          aria-label="Previous day"
          title="Previous day (Left arrow)"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Date display & picker trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-fg transition-colors hover:text-fg-2 focus-visible:outline-hidden"
            aria-label={`Choose date, currently ${dayName}, ${formattedDate}`}
          >
            <Calendar className="h-3.5 w-3.5 text-fg-3" />
            <span className="font-semibold text-fg">{dayName}</span>
            <span className="text-fg-3">·</span>
            <span className="tabular text-fg-2">{formattedDate}</span>
          </button>
          <input
            ref={inputRef}
            type="date"
            value={date}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="pointer-events-none absolute inset-0 opacity-0"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        {/* Next day */}
        <button
          type="button"
          onClick={() => onChange(addDays(date, 1))}
          className="btn btn-ghost btn-icon btn-sm h-8 w-8 text-fg-2 hover:text-fg"
          aria-label="Next day"
          title="Next day (Right arrow)"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Jump to Today button */}
      {!isCurrentDay && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="btn btn-secondary btn-sm h-8 px-2.5 text-xs font-medium text-fg shadow-xs"
          title="Jump to today (T)"
        >
          Today
        </button>
      )}

      {/* Subtle indicator when viewing past or future days */}
      {isHistorical && (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2/60 px-2 py-1 text-xs text-fg-3">
          <History className="h-3.5 w-3.5 text-fg-3" />
          <span>{dayDifference === -1 ? "Yesterday" : Math.abs(dayDifference) <= 7 ? `${Math.abs(dayDifference)}d ago` : "Past log"}</span>
        </div>
      )}
      {isFuture && (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2/60 px-2 py-1 text-xs text-fg-3">
          <ArrowRight className="h-3.5 w-3.5 text-fg-3" />
          <span>{dayDifference === 1 ? "Tomorrow" : Math.abs(dayDifference) <= 7 ? `In ${dayDifference}d` : "Upcoming"}</span>
        </div>
      )}
    </div>
  );
}
