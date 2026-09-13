import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  type: "calories" | "protein" | "carbs" | "fat";
  className?: string;
}

export function ProgressBar({
  label,
  current,
  target,
  unit,
  type,
  className,
}: ProgressBarProps) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isOver = current > target;
  const diff = current - target;

  // Specific data/nutrition color palette
  const getFillColor = () => {
    if (type === "calories") {
      return isOver ? "var(--status-over-target)" : "var(--status-on-track)";
    }
    if (type === "protein") return "var(--macro-protein)";
    if (type === "carbs") return "var(--macro-carbs)";
    if (type === "fat") return "var(--macro-fat)";
    return "var(--accent)";
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-[var(--text-primary)]">
          {label}
        </span>
        <div className="flex items-center space-x-1.5 font-tabular">
          <span className="font-semibold text-[var(--text-primary)]">
            {Math.round(current).toLocaleString()}
          </span>
          <span className="text-[var(--text-secondary)]">
            / {Math.round(target).toLocaleString()} {unit}
          </span>
          {isOver && (
            <span
              style={{ color: "var(--status-over-target)" }}
              className="text-xs font-medium ml-1"
            >
              (+{Math.round(diff)})
            </span>
          )}
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: getFillColor(),
          }}
        />
      </div>
    </div>
  );
}
