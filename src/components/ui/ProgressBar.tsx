import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  type: "calories" | "protein" | "carbs" | "fat";
  className?: string;
  inHero?: boolean;
}

export function ProgressBar({
  label,
  current,
  target,
  unit,
  type,
  className,
  inHero = false,
}: ProgressBarProps) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isOver = current > target;
  const diff = current - target;

  const getDotColor = () => {
    if (type === "calories") return isOver ? "var(--status-over-target)" : "var(--lime)";
    if (type === "protein") return "var(--macro-protein)";
    if (type === "carbs") return "var(--macro-carbs)";
    if (type === "fat") return "var(--macro-fat)";
    return "var(--lime)";
  };

  const getFillColor = () => {
    if (type === "calories") return isOver ? "var(--status-over-target)" : "var(--lime)";
    if (type === "protein") return "var(--macro-protein)";
    if (type === "carbs") return "var(--macro-carbs)";
    if (type === "fat") return "var(--macro-fat)";
    return "var(--lime)";
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span
          className={cn(
            "flex items-center gap-1.5 font-medium",
            inHero ? "text-[var(--hero-text)]" : "text-[var(--text-primary)]"
          )}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0 inline-block"
            style={{ backgroundColor: getDotColor() }}
            aria-hidden="true"
          />
          <span>{label}</span>
        </span>
        <div className="flex items-center space-x-1.5 font-tabular">
          <span
            className={cn(
              "font-semibold",
              inHero ? "text-[var(--hero-text)]" : "text-[var(--text-primary)]"
            )}
          >
            {Math.round(current).toLocaleString()}
          </span>
          <span
            className={
              inHero ? "text-[var(--hero-muted)]" : "text-[var(--text-secondary)]"
            }
          >
            / {Math.round(target).toLocaleString()} {unit}
          </span>
          {isOver && (
            <span
              style={{ color: "var(--status-over-target)" }}
              className="text-xs font-semibold ml-1"
            >
              (+{Math.round(diff)})
            </span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "w-full h-1.5 rounded-full overflow-hidden",
          inHero ? "bg-[var(--hero-track)]" : "bg-[var(--border)]"
        )}
      >
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
