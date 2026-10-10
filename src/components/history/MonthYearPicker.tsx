"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth, startOfMonth, todayLocal } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface MonthYearPickerProps {
  currentMonth: string; // "YYYY-MM"
  onChange: (month: string) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function MonthYearPicker({ currentMonth, onChange }: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [y, m] = currentMonth.slice(0, 7).split("-").map(Number);
  const [viewYear, setViewYear] = useState<number>(y);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const thisMonth = startOfMonth(todayLocal()).slice(0, 7);

  // Keep viewYear synced when currentMonth changes from outside
  useEffect(() => {
    setViewYear(y);
  }, [y]);

  // Click outside listener
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selectMonth = (monthIdx: number) => {
    const formatted = `${viewYear}-${String(monthIdx + 1).padStart(2, "0")}`;
    onChange(formatted);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="tap-target flex h-11 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface-3 focus-visible:outline-hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Select month and year, currently ${formatMonth(currentMonth)}`}
      >
        <span className="tabular">{formatMonth(currentMonth)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-fg-3 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Choose month and year"
          className="anim-fade absolute left-1/2 top-full z-40 mt-1.5 w-64 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 shadow-lg sm:left-0 sm:translate-x-0"
        >
          {/* Year Navigator */}
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <button
              type="button"
              onClick={() => setViewYear((v) => v - 1)}
              className="btn btn-ghost btn-icon btn-sm"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-sm tabular text-fg">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((v) => v + 1)}
              className="btn btn-ghost btn-icon btn-sm"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-1.5 py-2.5">
            {MONTH_NAMES.map((name, idx) => {
              const isSelected = viewYear === y && idx === m - 1;
              const isThisMonth = `${viewYear}-${String(idx + 1).padStart(2, "0")}` === thisMonth;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectMonth(idx)}
                  className={cn(
                    "rounded-lg py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-accent text-accent-fg font-semibold"
                      : isThisMonth
                      ? "border border-accent/40 bg-accent-soft/20 text-fg"
                      : "text-fg-2 hover:bg-surface-2 hover:text-fg"
                  )}
                  aria-pressed={isSelected}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Bottom helper */}
          <div className="border-t border-line pt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                onChange(thisMonth);
                setOpen(false);
              }}
              className="text-accent hover:underline font-medium"
            >
              Current month
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-fg-3 hover:text-fg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
