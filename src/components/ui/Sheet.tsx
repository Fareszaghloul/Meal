"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Element to focus on open (defaults to the first focusable inside). */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  customHeader?: React.ReactNode;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: bottom sheet on phones, centered on larger screens.
 * Traps focus, closes on Esc / backdrop, restores focus on close.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = "md", initialFocusRef, customHeader }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const titleId = React.useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      const target = initialFocusRef?.current ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && panel.current) {
        const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        // Focus can fall to <body> (e.g. a button disabled while saving): pull it back into the dialog.
        if (!panel.current.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      (previouslyFocused.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay anim-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "modal-panel anim-sheet flex max-h-[92dvh] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-t-3xl border border-line bg-surface sm:max-h-[85vh] sm:rounded-3xl",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          size === "xl" && "sm:max-w-[780px]"
        )}
      >
        {customHeader ? (
          customHeader
        ) : (
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-fg">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-xs text-fg-2">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm -mr-1.5" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </header>
        )}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <footer className="safe-bottom relative z-10 shrink-0 flex items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:px-5">{footer}</footer>}
      </div>
    </div>
  );
}
