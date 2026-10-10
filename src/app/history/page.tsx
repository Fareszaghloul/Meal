"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { fetchMonthHistory, invalidateMonthHistory, peekMonthHistory } from "@/lib/client/month-history";
import {
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
    peekMonthHistory(month)
  );
  const [loading, setLoading] = useState<boolean>(!peekMonthHistory(month));
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
      const cached = peekMonthHistory(m);
      if (!force && cached) {
        setHistoryData(cached);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        setHistoryData(await fetchMonthHistory(m, force));
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
        invalidateMonthHistory(null);
        void loadMonth(month, true);
        return;
      }
      const updatedMonth = updatedDate.slice(0, 7);
      invalidateMonthHistory(updatedMonth);
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <header className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-3">Logged days and totals</div>
          <h1 className="mt-0.5 text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-fg">History</h1>
        </div>

        {/* Month Navigation Toolbar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg transition-colors hover:bg-surface-3"
            onClick={() => handleMonthChange(shiftMonth(month, -1))}
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Month / Year Picker Popover */}
          <MonthYearPicker currentMonth={month} onChange={handleMonthChange} />

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg transition-colors hover:bg-surface-3"
            onClick={() => handleMonthChange(shiftMonth(month, 1))}
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {!isCurrentMonth || selectedDate !== today ? (
            <button type="button" className="btn btn-secondary ml-1 h-11 px-4 text-sm font-semibold" onClick={handleJumpToToday} title="Jump to today (T)">
              Today
            </button>
          ) : null}
        </div>
      </header>

      {/* Month Summary: three stat cards */}
      {historyData && (
        <section className="grid grid-cols-3 gap-2.5" aria-label="Month statistics">
          <div className="card p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Logged</div>
            <div className="tabular mt-1 text-2xl font-bold leading-tight tracking-tight">
              {historyData.summary.loggedDays}
              <span className="text-[13px] font-medium text-fg-3"> {historyData.summary.loggedDays === 1 ? "day" : "days"}</span>
            </div>
          </div>
          <div className="card p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Avg kcal</div>
            <div className="tabular mt-1 text-2xl font-bold leading-tight tracking-tight">{historyData.summary.loggedDays > 0 ? fmt.int(historyData.summary.avgCalories) : "—"}</div>
          </div>
          <div className="card p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Avg protein</div>
            <div className="tabular mt-1 text-2xl font-bold leading-tight tracking-tight">
              {historyData.summary.loggedDays > 0 ? fmt.g(historyData.summary.avgProtein) : "—"}
              {historyData.summary.loggedDays > 0 && <span className="text-[13px] font-medium text-fg-3"> g</span>}
            </div>
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
