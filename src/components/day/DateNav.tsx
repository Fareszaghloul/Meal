"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDate, relativeDayLabel, todayLocal, type DateString } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DateNav({ date, onChange }: { date: DateString; onChange: (d: DateString) => void }) {
  const today = todayLocal();
  const input = useRef<HTMLInputElement>(null);
  const isToday = date === today;
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(addDays(date, -1))} className="btn btn-ghost btn-icon" aria-label="Previous day">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => input.current?.showPicker?.() ?? input.current?.click()}
          className="btn btn-ghost min-w-[9rem] px-2 font-medium tabular"
          aria-label="Choose a date"
        >
          <span>{relativeDayLabel(date, today)}</span>
          <span className="text-fg-3">{isToday ? formatDate(date, { month: "short", day: "numeric" }) : formatDate(date, { year: date.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined })}</span>
        </button>
        <input
          ref={input}
          type="date"
          value={date}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <button type="button" onClick={() => onChange(addDays(date, 1))} className="btn btn-ghost btn-icon" aria-label="Next day">
        <ChevronRight className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onChange(today)} className={cn("btn btn-secondary btn-sm ml-1", isToday && "invisible")} aria-hidden={isToday}>
        Today
      </button>
    </div>
  );
}
