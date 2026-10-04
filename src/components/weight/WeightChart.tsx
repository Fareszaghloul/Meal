"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { withTrend } from "@/lib/nutrition/weight-trend";
import { addDays, diffDays, formatDate, type DateString } from "@/lib/dates";
import type { WeightEntry } from "@/lib/domain";
import { fromKg, type WeightUnit } from "@/lib/weight-units";
import { Segmented } from "@/components/ui/primitives";
import type { WeightRange } from "@/lib/client/weight-store";

/** Smallest y-span shown, so a 0.4 kg wobble doesn't fill the whole chart. */
const MIN_SPAN: Record<WeightUnit, number> = { kg: 2, lbs: 4 };

/** Round-number tick values covering [lo, hi] with roughly `target` ticks. */
function niceTicks(lo: number, hi: number, target: number): number[] {
  const raw = (hi - lo) / Math.max(1, target - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** Observed pixel width of an element, so the SVG is drawn 1:1 and text never shrinks with the viewport. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Raw readings as faint dots, 7-day average (of daily means) as the line.
 * X is proportional to date so gaps look like gaps. The goal never sets the scale; it's a reference line only when it falls inside it.
 */
export function WeightChart({
  entries,
  from,
  goalKg,
  unit,
  range,
  onRangeChange,
}: {
  entries: WeightEntry[];
  /** First visible date; entries before it are only the trend's lead-in. */
  from?: DateString;
  goalKg: number | null;
  unit: WeightUnit;
  range: WeightRange;
  onRangeChange: (r: WeightRange) => void;
}) {
  const [box, boxWidth] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const conv = (kg: number) => fromKg(kg, unit);

  const { days, dots } = useMemo(() => {
    const visible = (d: DateString) => !from || d >= from;
    return { days: withTrend(entries).filter((d) => visible(d.date)), dots: entries.filter((e) => visible(e.date)) };
  }, [entries, from]);

  const W = boxWidth || 320;
  const narrow = W < 480;
  const H = narrow ? 200 : 232;
  const pad = { l: narrow ? 40 : 46, r: 12, t: 12, b: 26 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const firstDate = days[0]?.date;
  const span = days.length > 1 ? diffDays(firstDate, days[days.length - 1].date) : 1;
  const xOf = (d: DateString) => pad.l + (diffDays(firstDate, d) / (span || 1)) * plotW;

  const values = days.flatMap((d) => [conv(d.meanKg), conv(d.trendKg)]).concat(dots.map((e) => conv(e.weightKg)));
  let lo = values.length ? Math.min(...values) : 0;
  let hi = values.length ? Math.max(...values) : 1;
  const grow = Math.max(0, MIN_SPAN[unit] - (hi - lo)) / 2;
  const margin = (hi - lo + 2 * grow) * 0.12;
  lo -= grow + margin;
  hi += grow + margin;
  const ticks = niceTicks(lo, hi, narrow ? 4 : 5);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * plotH;
  const line = days.map((d, i) => `${i ? "L" : "M"}${xOf(d.date).toFixed(1)},${y(conv(d.trendKg)).toFixed(1)}`).join(" ");

  const goal = goalKg !== null ? conv(goalKg) : null;
  const hovered = hover !== null ? days[hover] : null;
  const latest = days[days.length - 1];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    days.forEach((d, i) => {
      const dist = Math.abs(xOf(d.date) - px);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    });
    setHover(best);
  };

  const tickText = (v: number) => (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <div className="min-h-[1.25rem] text-xs text-fg-2" aria-live="polite">
          {hovered ? (
            <span className="tabular">
              {formatDate(hovered.date)} · day avg <span className="text-fg">{conv(hovered.meanKg).toFixed(1)} {unit}</span> · 7-day avg {conv(hovered.trendKg).toFixed(1)}
            </span>
          ) : (
            <span>
              <span className="mr-3 inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-fg" /> 7-day average
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-3" /> readings
              </span>
            </span>
          )}
        </div>
        <Segmented
          value={range}
          onChange={onRangeChange}
          size="sm"
          ariaLabel="Chart range"
          options={[
            { value: "30", label: "1M" },
            { value: "90", label: "3M" },
            { value: "365", label: "1Y" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
      <div ref={box} className="w-full">
        {days.length < 2 ? (
          <p className="px-4 py-10 text-center text-sm text-fg-3">Log a few more weigh-ins to see a trend.</p>
        ) : (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block touch-pan-y"
            role="img"
            aria-label={`Weight over time. Latest 7-day average ${conv(latest.trendKg).toFixed(1)} ${unit}. Individual readings are listed below.`}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--fg-3)" className="tabular">
                  {tickText(t)}
                </text>
              </g>
            ))}
            {goal !== null && goal >= lo && goal <= hi && (
              <>
                <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1} />
                <text x={W - pad.r} y={y(goal) - 4} textAnchor="end" fontSize={11} fill="var(--accent)">
                  goal {goal.toFixed(1)}
                </text>
              </>
            )}
            {dots.map((e) => (
              <circle
                key={e.id}
                cx={xOf(e.date)}
                cy={y(conv(e.weightKg))}
                r={hovered?.date === e.date ? 3.5 : 2.4}
                fill={hovered?.date === e.date ? "var(--fg)" : "var(--fg-3)"}
                opacity={hovered?.date === e.date ? 1 : 0.55}
              />
            ))}
            <path d={line} fill="none" stroke="var(--fg)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            <text x={pad.l} y={H - 7} fontSize={11} fill="var(--fg-3)">
              {formatDate(firstDate, { month: "short", day: "numeric" })}
            </text>
            {!narrow && span > 6 && (
              <text x={pad.l + plotW / 2} y={H - 7} textAnchor="middle" fontSize={11} fill="var(--fg-3)">
                {formatDate(addDays(firstDate, Math.round(span / 2)), { month: "short", day: "numeric" })}
              </text>
            )}
            <text x={W - pad.r} y={H - 7} textAnchor="end" fontSize={11} fill="var(--fg-3)">
              {formatDate(latest.date, { month: "short", day: "numeric" })}
            </text>
          </svg>
        )}
      </div>
    </div>
  );
}
