"use client";

import React, { useMemo, useState } from "react";
import { formatDate, type DateString } from "@/lib/dates";
import { useMonthHistories } from "@/lib/client/month-history";
import { buildWeekStrip, weekAverages, weekMonths, type DayFigures } from "@/lib/week-strip";
import { fmt, Segmented } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Mode = "eaten" | "left";

interface WeekStripProps {
  date: DateString;
  today: DateString;
  goalCalories: number;
  /** Freshly edited totals for the selected day, so the strip never lags behind the summary above it. */
  live: DayFigures;
  onSelectDate: (date: DateString) => void;
}

/** Seven-day calorie bars for the week around the selected day. Tapping a bar jumps to that day. */
export function WeekStrip({ date, today, goalCalories, live, onSelectDate }: WeekStripProps) {
  const [mode, setMode] = useState<Mode>("eaten");
  const months = useMemo(() => weekMonths(date), [date]);
  const histories = useMonthHistories(months);

  const days = useMemo(() => {
    const figures: Record<DateString, DayFigures | undefined> = {};
    for (const m of months) {
      for (const d of Object.values(histories[m]?.days ?? {})) figures[d.date] = { calories: d.calories, protein: d.protein };
    }
    return buildWeekStrip(date, today, goalCalories, figures, live);
  }, [date, today, goalCalories, live, months, histories]);

  const avg = weekAverages(days);

  return (
    <section aria-label="This week">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">This week</h2>
        <Segmented<Mode>
          ariaLabel="Week view"
          value={mode}
          onChange={setMode}
          options={[
            { value: "eaten", label: "Eaten" },
            { value: "left", label: "Left" },
          ]}
        />
      </div>

      <div className="card px-2.5 pb-3.5 pt-4 sm:px-4">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const over = d.percent > 105;
            const barPercent = mode === "eaten" ? Math.min(100, d.percent) : d.calories === null ? 0 : Math.max(0, 100 - d.percent);
            const label = `${formatDate(d.date, { weekday: "long", month: "short", day: "numeric" })}: ${
              d.calories === null || d.calories === 0 ? "nothing logged" : `${fmt.int(d.calories)} kcal`
            }${d.isToday ? ", today" : ""}`;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onSelectDate(d.date)}
                aria-label={label}
                aria-pressed={d.isSelected}
                className={cn("flex min-h-[44px] flex-col items-center gap-2 rounded-2xl py-2 transition-colors", d.isSelected ? "ring-[1.5px] ring-fg" : "hover:bg-surface-2/60")}
              >
                <span className="relative h-[84px] w-7 overflow-hidden rounded-[10px] bg-surface-2" aria-hidden="true">
                  <span
                    className="absolute inset-x-0 bottom-0 rounded-[10px] transition-[height] duration-300"
                    style={{ height: `${barPercent}%`, backgroundColor: mode === "eaten" && over ? "var(--carbs)" : "var(--accent)" }}
                  />
                </span>
                <span className={cn("text-xs font-semibold", d.isSelected ? "text-fg" : "text-fg-3")}>{d.label}</span>
              </button>
            );
          })}
        </div>

        <div className="tabular mt-2.5 flex items-center justify-between px-1.5 text-[13px] text-fg-3">
          {avg.loggedDays > 0 ? (
            <>
              <span>
                Avg <span className="font-semibold text-fg">{fmt.int(avg.calories)}</span> kcal
              </span>
              <span>
                Avg protein <span className="font-semibold text-fg">{fmt.int(avg.protein)}</span> g
              </span>
            </>
          ) : (
            <span>Nothing logged this week yet.</span>
          )}
        </div>
      </div>
    </section>
  );
}
