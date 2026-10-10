"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDate, todayLocal, diffDays, type DateString } from "@/lib/dates";

interface DateNavProps {
  date: DateString;
  onChange: (d: DateString) => void;
}

/** Large day title (tap to pick a date) with round previous/next buttons. */
export function DateNav({ date, onChange }: DateNavProps) {
  const today = todayLocal();
  const inputRef = useRef<HTMLInputElement>(null);
  const isCurrentDay = date === today;
  const dayDifference = diffDays(today, date);

  const dayName = isCurrentDay
    ? "Today"
    : dayDifference === -1
    ? "Yesterday"
    : dayDifference === 1
    ? "Tomorrow"
    : formatDate(date, { weekday: "long" });

  const eyebrow = formatDate(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined,
  });

  // A quiet marker whenever you are not looking at today, so an old day is never mistaken for a live one.
  // Yesterday and Tomorrow already say so in the title.
  const marker =
    dayDifference < -1
      ? Math.abs(dayDifference) <= 7
        ? `${Math.abs(dayDifference)}d ago`
        : "Past log"
      : dayDifference > 1
      ? dayDifference <= 7
        ? `In ${dayDifference}d`
        : "Upcoming"
      : null;

  const circle = "flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg transition-colors hover:bg-surface-3";

  return (
    <div className="flex items-end justify-between gap-3">
      <div className="relative min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-fg-3">
          <span className="truncate">{eyebrow}</span>
          {marker && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] normal-case tracking-normal">{marker}</span>}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
          className="mt-0.5 block min-h-[44px] max-w-full truncate text-left text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-fg"
          aria-label={`Choose date, currently ${dayName}, ${eyebrow}`}
        >
          {dayName}
        </button>
        <input ref={inputRef} type="date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)} className="pointer-events-none absolute inset-0 opacity-0" tabIndex={-1} aria-hidden="true" />
      </div>

      <div className="flex shrink-0 items-center gap-2 pb-0.5">
        {!isCurrentDay && (
          <button type="button" onClick={() => onChange(today)} className="btn btn-secondary h-11 px-4 text-sm font-semibold" title="Jump to today (T)">
            Today
          </button>
        )}
        <button type="button" onClick={() => onChange(addDays(date, -1))} className={circle} aria-label="Previous day" title="Previous day (Left arrow)">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => onChange(addDays(date, 1))} className={circle} aria-label="Next day" title="Next day (Right arrow)">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
