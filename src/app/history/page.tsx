"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/client/api";
import { addDays, daysInMonth, parseDate, startOfMonth, todayLocal, type DateString } from "@/lib/dates";
import type { DayStatus } from "@/lib/domain";
import { fmt } from "@/components/ui/primitives";
import { prefetchDay } from "@/lib/client/day-store";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthCache = new Map<string, DayStatus[]>();

function shiftMonth(month: DateString, by: number): DateString {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function HistoryPage() {
  const router = useRouter();
  const today = todayLocal();
  const [month, setMonth] = useState<DateString>(startOfMonth(today));
  const [days, setDays] = useState<DayStatus[] | null>(monthCache.get(month) ?? null);
  const [error, setError] = useState<string | null>(null);

  const last = `${month.slice(0, 7)}-${String(daysInMonth(month)).padStart(2, "0")}`;

  useEffect(() => {
    const cached = monthCache.get(month);
    setDays(cached ?? null);
    setError(null);
    api<DayStatus[]>(`/api/days?from=${month}&to=${last}`)
      .then((d) => {
        monthCache.set(month, d);
        setDays(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [month, last]);

  const byDate = useMemo(() => new Map((days ?? []).map((d) => [d.date, d])), [days]);
  const leading = (parseDate(month).getDay() + 6) % 7; // Monday-first
  const count = daysInMonth(month);
  const cells: (DateString | null)[] = [...Array(leading).fill(null), ...Array.from({ length: count }, (_, i) => addDays(month, i))];
  while (cells.length % 7) cells.push(null);

  const logged = (days ?? []).filter((d) => d.mealsLogged > 0);
  const avg = logged.length ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length) : null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">History</h1>
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium tabular">{parseDate(month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" disabled={month >= startOfMonth(today)}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className={cn("btn btn-secondary btn-sm ml-1", month === startOfMonth(today) && "invisible")} onClick={() => setMonth(startOfMonth(today))}>
            This month
          </button>
        </div>
      </header>

      {error && (
        <div className="card px-4 py-3 text-sm text-fg-2" role="alert">
          Couldn't load this month: {error}
        </div>
      )}

      <section className="card overflow-hidden" aria-label="Calendar">
        <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-medium uppercase tracking-wide text-fg-3">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} className="aspect-square border-b border-r border-line bg-surface-2/40 md:aspect-[4/3]" />;
            const s = byDate.get(d);
            const future = d > today;
            const status = !s || s.mealsLogged === 0 ? "none" : s.mealsLogged >= 3 ? "logged" : "partial";
            return (
              <button
                key={d}
                type="button"
                disabled={future}
                onMouseEnter={() => !future && prefetchDay(d)}
                onFocus={() => !future && prefetchDay(d)}
                onClick={() => router.push(d === today ? "/" : `/?date=${d}`)}
                aria-label={`${d}${s ? `, ${fmt.int(s.calories)} kilocalories, ${s.mealsLogged} meals` : ", nothing logged"}`}
                className={cn(
                  "flex aspect-square flex-col items-start justify-between border-b border-r border-line p-1.5 text-left transition-colors md:aspect-[4/3] md:p-2",
                  future ? "text-fg-3/50" : "hover:bg-surface-2",
                  d === today && "bg-accent-soft/60"
                )}
              >
                <span className={cn("text-xs tabular md:text-sm", d === today ? "font-semibold text-fg" : "text-fg-2")}>{Number(d.slice(8))}</span>
                {s && s.mealsLogged > 0 ? (
                  <span className="w-full">
                    <span className="hidden text-xs tabular text-fg md:block">{fmt.int(s.calories)}</span>
                    <span className="mt-1 flex gap-0.5">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={cn("h-1 flex-1 rounded-full", i < s.mealsLogged ? (status === "logged" ? "bg-fg" : "bg-fg-3") : "bg-surface-3")} />
                      ))}
                    </span>
                  </span>
                ) : (
                  !future && <span className="h-1 w-full rounded-full bg-surface-3 md:mt-1" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 text-xs text-fg-2">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-fg" /> 3+ meals logged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-fg-3" /> partially logged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-surface-3" /> nothing logged
          </span>
          {avg !== null && (
            <span className="ml-auto tabular">
              {logged.length} day{logged.length === 1 ? "" : "s"} logged · avg {fmt.int(avg)} kcal
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
