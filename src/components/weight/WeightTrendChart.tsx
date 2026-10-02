"use client";

import React, { useState, useMemo } from "react";
import { ProcessedWeightPoint } from "@/lib/nutrition/weight-analytics";
import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightTrendChartProps {
  entries: ProcessedWeightPoint[];
  goalWeightKg?: number | null;
  measurementSystem?: string;
  className?: string;
}

type TimeRange = "1m" | "3m" | "6m" | "1y" | "all";

export function WeightTrendChart({
  entries,
  goalWeightKg,
  measurementSystem = "metric",
  className,
}: WeightTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("3m");
  const [hoveredPoint, setHoveredPoint] = useState<ProcessedWeightPoint | null>(null);

  const isImperial = measurementSystem === "imperial";
  const unitLabel = isImperial ? "lbs" : "kg";
  const toDisplay = (kg: number) =>
    isImperial ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10;

  // Filter entries based on timeRange
  const filteredEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    if (timeRange === "all") return entries;

    const now = new Date().getTime();
    const daysMap: Record<TimeRange, number> = {
      "1m": 30,
      "3m": 90,
      "6m": 180,
      "1y": 365,
      all: 99999,
    };
    const cutoff = now - daysMap[timeRange] * 24 * 60 * 60 * 1000;

    return entries.filter((e) => new Date(e.date).getTime() >= cutoff);
  }, [entries, timeRange]);

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-[var(--surface)] text-[var(--text-secondary)]">
        <TrendingDown className="w-8 h-8 mb-2 opacity-40 text-[var(--text-secondary)]" />
        <p className="text-sm font-medium text-[var(--text-primary)]">No weight entries recorded yet</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Log your daily or weekly weight to see your trend curve and 7-day average.
        </p>
      </div>
    );
  }

  // Calculate chart boundaries
  const displayPoints = filteredEntries.length > 0 ? filteredEntries : entries;

  const weights = displayPoints.map((p) => toDisplay(p.weightKg));
  const rollings = displayPoints.map((p) => toDisplay(p.rollingAvg7d));
  const allValues = [...weights, ...rollings];

  if (goalWeightKg) {
    allValues.push(toDisplay(goalWeightKg));
  }

  const minVal = Math.floor(Math.min(...allValues) - 1.5);
  const maxVal = Math.ceil(Math.max(...allValues) + 1.5);
  const valRange = Math.max(1, maxVal - minVal);

  // Chart layout dimensions
  const svgWidth = 800;
  const svgHeight = 300;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinate mappers
  const getX = (index: number) => {
    if (displayPoints.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (displayPoints.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;
  };

  // Generate SVG path for 7-day rolling average line
  const rollingPathD = displayPoints.reduce((acc, p, i) => {
    const x = getX(i);
    const y = getY(toDisplay(p.rollingAvg7d));
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  // Goal weight Y line
  const goalY = goalWeightKg ? getY(toDisplay(goalWeightKg)) : null;

  // Grid tick marks
  const numTicks = 5;
  const yTicks = Array.from({ length: numTicks }).map((_, i) => {
    const val = minVal + (i / (numTicks - 1)) * valRange;
    return Math.round(val * 10) / 10;
  });

  return (
    <div
      className={cn(
        "p-6 rounded-3xl bg-[var(--surface)] space-y-4",
        className
      )}
    >
      {/* Header with Time Range Selectors and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--lime)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              7-day rolling avg
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-secondary)]">
              Raw entry
            </span>
          </div>
          {goalWeightKg && (
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-[var(--macro-carbs)]" />
              <span className="text-xs text-[var(--macro-carbs)] font-medium font-tabular">
                Goal ({toDisplay(goalWeightKg)} {unitLabel})
              </span>
            </div>
          )}
        </div>

        {/* Time Filter Pill Buttons */}
        <div className="flex items-center p-1 rounded-full bg-[var(--background)] text-xs">
          {(["1m", "3m", "6m", "1y", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-3 py-1 rounded-full font-medium transition cursor-pointer",
                timeRange === r
                  ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart (Flat styles only, no flashy visual complexity) */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-h-[250px] select-none"
        >
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] font-tabular fill-[var(--text-secondary)]"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Goal Weight Line */}
          {goalY !== null && (
            <g>
              <line
                x1={paddingLeft}
                y1={goalY}
                x2={svgWidth - paddingRight}
                y2={goalY}
                stroke="var(--macro-carbs)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={svgWidth - paddingRight}
                y={goalY - 6}
                textAnchor="end"
                className="text-[10px] font-medium font-tabular fill-[var(--macro-carbs)]"
              >
                Goal {toDisplay(goalWeightKg!)} {unitLabel}
              </text>
            </g>
          )}

          {/* 7-Day Rolling Average Solid Line (thick lime) */}
          {displayPoints.length > 1 && (
            <path
              d={rollingPathD}
              fill="none"
              stroke="var(--lime)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Raw Entry Points */}
          {displayPoints.map((p, i) => {
            const x = getX(i);
            const rawY = getY(toDisplay(p.weightKg));
            const rollingY = getY(toDisplay(p.rollingAvg7d));
            const isHovered = hoveredPoint?.id === p.id;

            return (
              <g key={p.id || i} className="cursor-pointer">
                {/* Connector from raw to rolling */}
                <line
                  x1={x}
                  y1={rawY}
                  x2={x}
                  y2={rollingY}
                  stroke="var(--border)"
                  strokeWidth="1"
                />

                {/* Raw entry dot */}
                <circle
                  cx={x}
                  cy={rawY}
                  r={isHovered ? "4.5" : "3"}
                  fill="var(--text-muted)"
                  fillOpacity={isHovered ? 1 : 0.6}
                  stroke="var(--surface)"
                  strokeWidth={isHovered ? "2" : "1"}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {/* Rolling avg node */}
                <circle
                  cx={x}
                  cy={rollingY}
                  r="2.5"
                  fill="var(--lime)"
                />

                {/* X-axis date label */}
                {(i === 0 ||
                  i === displayPoints.length - 1 ||
                  (displayPoints.length > 6 &&
                    i % Math.floor(displayPoints.length / 5) === 0)) && (
                  <text
                    x={x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    className="text-[10px] font-tabular fill-[var(--text-secondary)]"
                  >
                    {p.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-2xl bg-[var(--surface)] text-[var(--text-primary)] shadow-xl text-xs flex items-center space-x-4 animate-in fade-in pointer-events-none font-tabular">
            <div>
              <span className="text-[11px] text-[var(--text-secondary)] block font-normal">
                {hoveredPoint.date}
              </span>
              <span className="font-semibold text-sm text-[var(--text-primary)]">
                {toDisplay(hoveredPoint.weightKg)} {unitLabel}
              </span>
            </div>
            <div className="border-l border-[var(--border)] pl-3">
              <span className="text-[11px] text-[var(--text-secondary)] block font-normal">
                7d rolling avg
              </span>
              <span className="font-semibold text-sm text-[var(--lime)]">
                {toDisplay(hoveredPoint.rollingAvg7d)} {unitLabel}
              </span>
            </div>
            {hoveredPoint.notes && (
              <div className="border-l border-[var(--border)] pl-3 max-w-[140px] truncate text-xs text-[var(--text-secondary)] font-normal">
                {hoveredPoint.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
