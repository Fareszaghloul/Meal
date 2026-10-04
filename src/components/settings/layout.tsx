import React from "react";
import { cn } from "@/lib/utils";

/** A preferences group: title, optional one-line description, rows separated by fine dividers. */
export function Section({
  id,
  title,
  description,
  children,
  footer,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="card scroll-mt-20 overflow-hidden">
      <header className="border-b border-line px-4 py-3">
        <h2 id={`${id}-title`} className="text-sm font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-fg-3">{description}</p>}
      </header>
      <div className="divide-y divide-line">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/40 px-4 py-3">{footer}</div>}
    </section>
  );
}

/** Label (+ hint) on the left, control on the right; stacks on phones. */
export function Row({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center sm:gap-6", className)}>
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
            {label}
          </label>
        ) : (
          <div className="text-sm font-medium text-fg">{label}</div>
        )}
        {hint && <p className="mt-0.5 text-xs text-fg-3">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Inline error for a section's last failed save. */
export function SaveError({ message }: { message: string | null }) {
  return (
    <p role="alert" className={cn("mr-auto text-xs text-negative", !message && "sr-only")}>
      {message ?? ""}
    </p>
  );
}
