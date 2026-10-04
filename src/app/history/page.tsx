"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { api } from "@/lib/client/api";
import {
  formatMonth,
  shiftMonth,
  startOfMonth,
  todayLocal,
  type DateString,
} from "@/lib/dates";
import type { MonthHistoryResponse } from "@/lib/domain";
import { MonthYearPicker } from "@/components/history/MonthYearPicker";
import { MonthCalendar } from "@/components/history/MonthCalendar";
import { DayPreviewPanel } from "@/components/history/DayPreviewPanel";
import { fmt } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const monthHistoryCache = new Map<string, MonthHistoryResponse>();
// One request per month even if the effect runs twice (React strict mode) or two triggers coincide.
const monthInflight = new Map<string, Promise<MonthHistoryResponse>>();

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = todayLocal();

  // Read initial month and date from query parameters or default to current local date
  const initialMonthParam = searchParams.get("month");
  const initialDateParam = searchParams.get("date");

  const [month, setMonth] = useState<string>(() => {
    if (initialMonthParam && /^\d{4}-\d{2}$/.test(initialMonthParam)) {
      return initialMonthParam;
    }
    if (initialDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam)) {
      return initialDateParam.slice(0, 7);
    }
    return startOfMonth(today).slice(0, 7);
  });

  const [selectedDate, setSelectedDate] = useState<DateString>(() => {
    if (initialDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam)) {
      return initialDateParam;
    }
    return today;
  });

  const [historyData, setHistoryData] = useState<MonthHistoryResponse | null>(() =>
    monthHistoryCache.get(month) ?? null
  );
  const [loading, setLoading] = useState<boolean>(!monthHistoryCache.has(month));
  const [error, setError] = useState<string | null>(null);

  // Sync state to URL search parameters for refresh and back/forward persistence
  const updateUrl = useCallback(
    (newMonth: string, newDate: DateString) => {
      const params = new URLSearchParams(window.location.search);
      params.set("month", newMonth);
      params.set("date", newDate);
      router.replace(`/history?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  // Fetch month data with caching
  const loadMonth = useCallback(
    async (m: string, force = false) => {
      if (!force && monthHistoryCache.has(m)) {
        setHistoryData(monthHistoryCache.get(m)!);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const pending = monthInflight.get(m) ?? api<MonthHistoryResponse>(`/api/history/month?month=${m}`).finally(() => monthInflight.delete(m));
        monthInflight.set(m, pending);
        const res = await pending;
        monthHistoryCache.set(m, res);
        setHistoryData(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load history");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadMonth(month);
  }, [month, loadMonth]);

  // Handle month change
  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    // If selectedDate is not in the new month, default selected date to the 1st of that month
    const newSelectedDate =
      selectedDate.slice(0, 7) === newMonth ? selectedDate : `${newMonth}-01`;
    setSelectedDate(newSelectedDate);
    updateUrl(newMonth, newSelectedDate);
  };

  // Handle date selection
  const handleSelectDate = (date: DateString) => {
    setSelectedDate(date);
    const dateMonth = date.slice(0, 7);
    if (dateMonth !== month) {
      setMonth(dateMonth);
      updateUrl(dateMonth, date);
    } else {
      updateUrl(month, date);
    }
  };

  // Jump to Today
  const handleJumpToToday = () => {
    const todayMonth = startOfMonth(today).slice(0, 7);
    setMonth(todayMonth);
    setSelectedDate(today);
    updateUrl(todayMonth, today);
  };

  // Open full day in Daily Dashboard
  const handleOpenDay = (date: DateString) => {
    router.push(date === today ? "/" : `/?date=${date}`);
  };

  // Listen to day updates from day-store mutation pipeline
  useEffect(() => {
    const handleDayUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ date: DateString | null }>;
      const updatedDate = customEvent.detail?.date;
      if (!updatedDate) {
        monthHistoryCache.clear();
        void loadMonth(month, true);
        return;
      }
      const updatedMonth = updatedDate.slice(0, 7);
      monthHistoryCache.delete(updatedMonth);
      if (updatedMonth === month) {
        void loadMonth(month, true);
      }
    };

    window.addEventListener("mealprep:day-updated", handleDayUpdate);
    return () => {
      window.removeEventListener("mealprep:day-updated", handleDayUpdate);
    };
  }, [month, loadMonth]);

  const selectedDayData = historyData?.days?.[selectedDate] ?? null;
  const isCurrentMonth = month === startOfMonth(today).slice(0, 7);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-fg">History</h1>
          <p className="mt-0.5 text-xs text-fg-3">
            Review past nutrition totals, meal patterns, and logged days
          </p>
        </div>

        {/* Month Navigation Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Previous Month */}
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm h-8 w-8"
            onClick={() => handleMonthChange(shiftMonth(month, -1))}
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Month / Year Picker Popover */}
          <MonthYearPicker currentMonth={month} onChange={handleMonthChange} />

          {/* Next Month */}
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm h-8 w-8"
            onClick={() => handleMonthChange(shiftMonth(month, 1))}
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Jump to Today Button */}
          {!isCurrentMonth || selectedDate !== today ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm h-8 px-2.5 text-xs font-medium ml-1"
              onClick={handleJumpToToday}
              title="Jump to today (T)"
            >
              Today
            </button>
          ) : null}
        </div>
      </header>

      {/* Month Summary KPI Banner */}
      {historyData && (
        <section
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-1 px-4 py-2.5 text-xs text-fg-3"
          aria-label="Month statistics"
        >
          <div className="flex items-center gap-1.5 font-medium text-fg">
            <span className="tabular">{formatMonth(month)} Summary</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 tabular">
            <div>
              <span className="text-fg-3 mr-1.5">Logged:</span>
              <strong className="text-fg font-semibold">
                {historyData.summary.loggedDays}{" "}
                {historyData.summary.loggedDays === 1 ? "day" : "days"}
              </strong>
            </div>

            {historyData.summary.loggedDays > 0 && (
              <>
                <div>
                  <span className="text-fg-3 mr-1.5">Daily avg:</span>
                  <strong className="text-fg font-semibold">
                    {fmt.int(historyData.summary.avgCalories)} kcal
                  </strong>
                </div>
                <div className="hidden sm:block">
                  <span className="text-fg-3 mr-1.5">Avg protein:</span>
                  <strong className="text-blue-400 font-semibold">
                    {fmt.g(historyData.summary.avgProtein)}
                  </strong>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div
          className="flex items-center justify-between rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-xs text-negative"
          role="alert"
        >
          <span>Couldn't load history: {error}</span>
          <button
            type="button"
            onClick={() => void loadMonth(month, true)}
            className="btn btn-ghost btn-sm h-7 gap-1 text-negative hover:bg-negative/20"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Calendar Grid */}
        <div className="lg:col-span-7 xl:col-span-7">
          <MonthCalendar
            month={month}
            selectedDate={selectedDate}
            days={historyData?.days ?? {}}
            goals={historyData?.goals}
            onSelectDate={handleSelectDate}
            onOpenDay={handleOpenDay}
          />
        </div>

        {/* Right Column: Selected Day Details Inspector */}
        <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-4">
          <DayPreviewPanel
            date={selectedDate}
            dayData={selectedDayData}
            goals={historyData?.goals}
            weightUnit={historyData?.weightUnit}
            onOpenDay={handleOpenDay}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 animate-pulse">
      <div className="h-10 w-48 rounded-lg bg-surface-2" />
      <div className="h-10 w-full rounded-lg bg-surface-2" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-96 rounded-xl bg-surface-2 lg:col-span-7" />
        <div className="h-96 rounded-xl bg-surface-2 lg:col-span-5" />
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryContent />
    </Suspense>
  );
}
