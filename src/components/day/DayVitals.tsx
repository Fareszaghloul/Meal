"use client";

import React from "react";
import Link from "next/link";
import { Droplet, Minus, Plus, RotateCcw, Scale } from "lucide-react";
import type { DayData } from "@/lib/domain";
import { fmt, Menu } from "@/components/ui/primitives";
import { addWater, resetWater, undoWater } from "@/lib/client/day-store";
import { formatDate, todayLocal } from "@/lib/dates";
import { fromKg } from "@/lib/weight-units";
import { percentOf } from "@/lib/nutrition/core";

const liters = (ml: number) => String(Number((ml / 1000).toFixed(2)));

/** Water and weight for the selected day: two tiles under the meals. */
export function DayVitals({ day }: { day: DayData }) {
  const { water, weight } = day;

  // Weight is per day: this date's latest daily reading. Only on actual Today may an older reading
  // stand in, and then it carries its own date so it never reads as today's measurement.
  const conv = (v: number | null) => (v === null ? null : fromKg(v, weight.unit));
  const loggedThisDay = weight.latestKg !== null && weight.latestDate === day.date;
  const staleLatest = !loggedThisDay && weight.latestKg !== null && day.date === todayLocal();
  const latestWeight = conv(weight.latestKg);
  const changeWeight = conv(weight.change7Kg);
  const waterPct = Math.min(100, percentOf(water.totalMl, water.goalMl));

  return (
    <section aria-label="Water and weight" className="grid grid-cols-2 gap-3">
      <div className="card flex flex-col p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--water)]">
            <Droplet className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-3">Water</span>
          </div>
          {water.totalMl > 0 && (
            <Menu
              label="Water actions"
              items={[
                { label: "Remove 250 ml", icon: <Minus className="h-3.5 w-3.5" />, onClick: () => undoWater(day.date) },
                { label: "Reset to 0", icon: <RotateCcw className="h-3.5 w-3.5" />, danger: true, onClick: () => resetWater(day.date) },
              ]}
            />
          )}
        </div>
        <div className="tabular mt-2.5 text-[26px] font-bold leading-none tracking-tight">
          {liters(water.totalMl)}
          <span className="text-sm font-medium text-fg-3"> / {liters(water.goalMl)} L</span>
        </div>
        <div className="bar mt-3" style={{ height: 8 }} role="progressbar" aria-label="Water progress" aria-valuenow={water.totalMl} aria-valuemin={0} aria-valuemax={water.goalMl}>
          <span style={{ width: `${waterPct}%`, backgroundColor: "var(--water)" }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => addWater(day.date, 250)} className="btn tabular h-11 bg-surface-2 px-2 text-sm font-semibold hover:bg-surface-3" aria-label="Add 250 ml water">
            <Plus className="h-3.5 w-3.5" /> 250
          </button>
          <button type="button" onClick={() => addWater(day.date, 500)} className="btn tabular h-11 bg-surface-2 px-2 text-sm font-semibold hover:bg-surface-3" aria-label="Add 500 ml water">
            <Plus className="h-3.5 w-3.5" /> 500
          </button>
        </div>
      </div>

      <Link href="/weight" className="card flex flex-col p-4 transition-colors hover:bg-surface-2" title="Go to weight tracking">
        <div className="flex items-center gap-2 text-fg-2">
          <Scale className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-3">Weight</span>
        </div>
        {latestWeight !== null && (loggedThisDay || staleLatest) ? (
          <>
            <div className="tabular mt-2.5 text-[26px] font-bold leading-none tracking-tight">
              {latestWeight.toFixed(1)}
              <span className="text-sm font-medium text-fg-3"> {weight.unit}</span>
            </div>
            <div className="mt-auto pt-3 text-[13px] text-fg-3">
              {loggedThisDay ? (
                changeWeight !== null ? (
                  <>
                    <span className="tabular font-semibold text-fg">{fmt.signed(changeWeight)} {weight.unit}</span> over 7 days
                  </>
                ) : (
                  "Logged today"
                )
              ) : (
                <>Latest · {formatDate(weight.latestDate!, { month: "short", day: "numeric" })}</>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mt-2.5 text-[26px] font-bold leading-none tracking-tight text-fg-3">—</div>
            <div className="mt-auto pt-3 text-[13px] text-fg-3">No weight logged</div>
          </>
        )}
      </Link>
    </section>
  );
}
