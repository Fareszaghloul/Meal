"use client";

import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── numbers ───────── */

export const fmt = {
  int: (n: number) => Math.round(n).toLocaleString("en-US"),
  g: (n: number) => (Math.abs(n) < 10 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toString()),
  one: (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 }),
  qty: (n: number) => (Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toString()),
  // Round first so a value that displays as 0.0 never shows a sign.
  signed: (n: number, digits = 1) => {
    const r = Number(n.toFixed(digits));
    return `${r > 0 ? "+" : ""}${r.toFixed(digits)}`;
  },
};

/* ───────── NumberField: decimals-friendly numeric input ───────── */

interface NumberFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  label?: string;
  error?: string;
  /** Allow "1/2"-style input? No. Allow comma decimals: yes (normalised to a dot). */
}

export const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField({ value, onChange, unit, label, error, className, id, ...rest }, ref) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? "true" : undefined}
          className={cn("input tabular", unit && "pr-10")}
          value={value}
          onChange={(e) => {
            // Accept digits, one dot/comma; keep as text so "1." and "0.5" type naturally.
            const v = e.target.value.replace(",", ".");
            if (v === "" || /^\d*\.?\d*$/.test(v)) onChange(v);
          }}
          onFocus={(e) => e.currentTarget.select()}
          {...rest}
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-fg-3">{unit}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-negative">{error}</p>}
    </div>
  );
});

export const parseNum = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/* ───────── TextField ───────── */

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, error, className, id, ...rest }, ref) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input ref={ref} id={inputId} aria-invalid={error ? "true" : undefined} className="input" {...rest} />
      {error && <p className="mt-1 text-xs text-negative">{error}</p>}
    </div>
  );
});

/* ───────── Segmented control ───────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  itemClassName,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  itemClassName?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex rounded-md border border-line bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "seg-item flex-1 whitespace-nowrap rounded-[5px] font-medium transition-colors",
            size === "sm" ? "tap-target px-2.5 py-1 text-xs min-h-[28px]" : "tap-target px-3 py-1.5 text-sm min-h-[32px]",
            value === o.value ? "bg-surface text-fg shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-fg-2 hover:text-fg",
            itemClassName
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ───────── Menu (small dropdown) ───────── */

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function Menu({ items, label = "More actions", align = "right", trigger }: { items: MenuItem[]; label?: string; align?: "left" | "right"; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)} className="btn btn-ghost btn-icon btn-sm">
        {trigger ?? <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <div role="menu" className={cn("anim-fade absolute z-50 mt-1 min-w-[180px] overflow-hidden rounded-md border border-line bg-surface py-1 shadow-md", align === "right" ? "right-0" : "left-0")}>
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={cn("menu-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50", it.danger ? "text-negative" : "text-fg")}
            >
              {it.icon && <span className="text-fg-3">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Empty state ───────── */

export function EmptyState({ title, description, action, compact }: { title: string; description?: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-6" : "py-12")}>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-fg-2">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ───────── Progress bar ───────── */

export function Bar({ value, color = "var(--accent)", over }: { value: number; color?: string; over?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="bar" role="presentation">
      <span style={{ width: `${pct}%`, backgroundColor: over ? "var(--negative)" : color }} />
    </div>
  );
}

/* ───────── Confirm dialog (native-free) ───────── */

export function useConfirm() {
  // Native confirm() is reliable, keyboard-accessible and needs no code. Good enough for a personal app.
  return (message: string) => (typeof window === "undefined" ? false : window.confirm(message));
}

/* ───────── Spinner ───────── */
export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-fg-3 border-t-transparent", className)} aria-hidden="true" />;
}
