"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { diffDays, formatDate, parseDate, type DateString } from "@/lib/dates";
import { fromKg, type WeightUnit } from "@/lib/weight-units";
import { fmt } from "@/components/ui/primitives";

interface WeightPoint {
  date: DateString;
  meanKg: number;
  trendKg: number;
}

interface WeightAnalyticsChartProps {
  points: WeightPoint[];
  from: DateString;
  to: DateString;
  unit: WeightUnit;
  goalKg: number | null;
}

export function WeightAnalyticsChart({ points, from, to, unit, goalKg }: WeightAnalyticsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const conv = (kg: number) => fromKg(kg, unit);

  const W = width;
  const H = 160;
  const pad = { l: 48, r: 16, t: 20, b: 28 };
  const plotW = Math.max(10, W - pad.l - pad.r);
  const plotH = Math.max(10, H - pad.t - pad.b);

  const totalDays = Math.max(1, diffDays(from, to));

  const xOfDate = (date: DateString) => {
    const offset = diffDays(from, date);
    return pad.l + (offset / totalDays) * plotW;
  };

  const { minVal, maxVal, yTicks } = useMemo(() => {
    if (points.length === 0) {
      return { minVal: 70, maxVal: 80, yTicks: [70, 75, 80] };
    }
    const vals = points.flatMap((p) => [conv(p.meanKg), conv(p.trendKg)]);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);

    // Keep span at least 1.5 kg / 3 lbs so minor wobbles aren't exaggerated
    const minSpan = unit === "lbs" ? 3 : 1.5;
    if (hi - lo < minSpan) {
      const mid = (hi + lo) / 2;
      lo = mid - minSpan / 2;
      hi = mid + minSpan / 2;
    }
    const margin = (hi - lo) * 0.1;
    lo -= margin;
    hi += margin;

    // 3 ticks
    const step = (hi - lo) / 2;
    const ticks = [lo, lo + step, hi].map((v) => Math.round(v * 10) / 10);

    return { minVal: lo, maxVal: hi, yTicks: ticks };
  }, [points, unit]);

  const yOf = (val: number) => {
    const span = maxVal - minVal || 1;
    return pad.t + (1 - (val - minVal) / span) * plotH;
  };

  if (points.length === 0) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-md border border-line bg-surface-2/40 px-4 text-center">
        <p className="text-xs text-fg-3">No daily weigh-ins logged in this period</p>
        <Link href="/weight" className="mt-1 text-xs text-primary hover:underline">
          Go to Weight tracking
        </Link>
      </div>
    );
  }

  // Construct path for 7-day trend line
  const trendLine = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOfDate(p.date).toFixed(1)},${yOf(conv(p.trendKg)).toFixed(1)}`)
    .join(" ");

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let closestIdx = 0;
    let closestDist = Infinity;

    points.forEach((p, i) => {
      const dist = Math.abs(xOfDate(p.date) - px);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    if (closestDist < 30) {
      setHoverIndex(closestIdx);
    } else {
      setHoverIndex(null);
    }
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div ref={containerRef} className="w-full select-none" data-testid="weight-analytics-container">
      {/* Header hover indicator */}
      <div className="flex min-h-[1.75rem] items-center justify-between px-1 text-xs text-fg-2">
        {hovered ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-fg">{formatDate(hovered.date)}</span>
            <span className="tabular">
              <span className="text-fg-3">day avg: </span>
              <span className="font-semibold text-fg">{conv(hovered.meanKg).toFixed(1)} {unit}</span>
              <span className="ml-2 text-fg-3">· 7-day trend: </span>
              <span className="font-semibold text-fg">{conv(hovered.trendKg).toFixed(1)} {unit}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 bg-fg" /> 7-day average
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-3" /> Day readings
            </span>
          </div>
        )}
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y"
        role="img"
        aria-label="Body weight trend over time. Individual daily averages and trailing 7-day trend line."
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tick) => (
          <g key={`wy-${tick}`}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <text
              x={pad.l - 8}
              y={yOf(tick) + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--fg-3)"
              className="tabular select-none"
            >
              {tick} {unit}
            </text>
          </g>
        ))}

        {/* Goal line if present and within scale */}
        {goalKg && conv(goalKg) >= minVal && conv(goalKg) <= maxVal && (
          <g>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={yOf(conv(goalKg))}
              y2={yOf(conv(goalKg))}
              stroke="var(--fg-3)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={W - pad.r}
              y={yOf(conv(goalKg)) - 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--fg-3)"
              className="tabular select-none"
            >
              Goal {conv(goalKg).toFixed(1)} {unit}
            </text>
          </g>
        )}

        {/* 7-day trend smooth path */}
        <path
          d={trendLine}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Daily mean dots */}
        {points.map((p, i) => {
          const cx = xOfDate(p.date);
          const cy = yOf(conv(p.meanKg));
          const isHovered = hoverIndex === i;

          return (
            <circle
              key={p.date}
              cx={cx}
              cy={cy}
              r={isHovered ? 3.5 : 2}
              fill={isHovered ? "var(--primary)" : "var(--fg-3)"}
              opacity={isHovered ? 1 : 0.75}
            />
          );
        })}
      </svg>
    </div>
  );
}
