"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronDown, X, Calendar as CalendarIcon, Check } from "lucide-react";
import { MEAL_CATEGORIES, MEAL_LABELS, type MealCategory } from "@/lib/domain";
import { type DateString, todayLocal, addDays, isToday, isYesterday, formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface MealDateHeaderProps {
  meal: MealCategory;
  onMealChange: (meal: MealCategory) => void;
  date: DateString;
  onDateChange: (date: DateString) => void;
  title?: string;
  onBack?: () => void;
  onClose: () => void;
  subTitle?: string;
}

export function MealDateHeader({
  meal,
  onMealChange,
  date,
  onDateChange,
  title = "Add food",
  onBack,
  onClose,
  subTitle,
}: MealDateHeaderProps) {
  const [mealMenuOpen, setMealMenuOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [customDateActive, setCustomDateActive] = useState(false);

  const mealRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (mealRef.current && !mealRef.current.contains(e.target as Node)) {
        setMealMenuOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = todayLocal();
  const yesterday = addDays(today, -1);

  const dateLabel = isToday(date)
    ? "Today"
    : isYesterday(date)
    ? "Yesterday"
    : formatDisplayDate(date);

  return (
    <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="btn btn-ghost btn-icon btn-sm -ml-1 text-fg-2 hover:text-fg"
            aria-label="Go back to search"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-fg sm:text-lg">
              {title}
            </h2>
            {subTitle && (
              <span className="text-xs text-fg-3 font-normal">
                {subTitle}
              </span>
            )}
          </div>

          {!onBack && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-2">
              {/* Meal Selector Dropdown */}
              <div className="relative inline-block" ref={mealRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMealMenuOpen(!mealMenuOpen);
                    setDateMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors hover:bg-surface-2 hover:text-fg",
                    mealMenuOpen ? "bg-surface-2 text-fg" : "text-fg-2"
                  )}
                  aria-expanded={mealMenuOpen}
                  aria-label="Change meal category"
                >
                  <span>{MEAL_LABELS[meal]}</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {mealMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[130px] rounded-lg border border-line bg-surface p-1 shadow-xl">
                    {MEAL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          onMealChange(cat);
                          setMealMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                          meal === cat
                            ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                            : "text-fg-2 hover:bg-surface-2 hover:text-fg"
                        )}
                      >
                        <span>{MEAL_LABELS[cat]}</span>
                        {meal === cat && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-fg-4 select-none">·</span>

              {/* Date Selector Dropdown */}
              <div className="relative inline-block" ref={dateRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDateMenuOpen(!dateMenuOpen);
                    setMealMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-surface-2 hover:text-fg",
                    dateMenuOpen ? "bg-surface-2 text-fg" : "text-fg-2"
                  )}
                  aria-expanded={dateMenuOpen}
                  aria-label="Change log date"
                >
                  <span>{dateLabel}</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {dateMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[150px] rounded-lg border border-line bg-surface p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        onDateChange(today);
                        setDateMenuOpen(false);
                        setCustomDateActive(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                        isToday(date)
                          ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                          : "text-fg-2 hover:bg-surface-2 hover:text-fg"
                      )}
                    >
                      <span>Today</span>
                      {isToday(date) && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDateChange(yesterday);
                        setDateMenuOpen(false);
                        setCustomDateActive(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                        isYesterday(date)
                          ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                          : "text-fg-2 hover:bg-surface-2 hover:text-fg"
                      )}
                    >
                      <span>Yesterday</span>
                      {isYesterday(date) && <Check className="h-3.5 w-3.5" />}
                    </button>

                    <div className="my-1 border-t border-line" />

                    <div className="px-2 py-1">
                      <label className="mb-1 block text-[10px] text-fg-3 uppercase tracking-wider font-semibold">
                        Custom Date
                      </label>
                      <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={(e) => {
                          if (e.target.value) {
                            onDateChange(e.target.value as DateString);
                            setDateMenuOpen(false);
                          }
                        }}
                        className="input input-sm w-full text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="btn btn-ghost btn-icon btn-sm -mr-1 text-fg-3 hover:text-fg"
        aria-label="Close modal"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}
