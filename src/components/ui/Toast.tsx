"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "info" | "error" | "success";
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
}

type ToastFn = (message: string, opts?: { kind?: ToastKind; action?: Toast["action"]; durationMs?: number }) => void;

const ToastContext = createContext<ToastFn>(() => {});

/** Module-level hook so non-React code (the write queue) can show messages. */
let externalToast: ToastFn = () => {};
export const toast: ToastFn = (m, o) => externalToast(m, o);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback<ToastFn>((message, opts) => {
    const id = ++counter.current;
    setToasts((t) => [...t.slice(-3), { id, message, kind: opts?.kind ?? "info", action: opts?.action }]);
    const ms = opts?.durationMs ?? (opts?.kind === "error" ? 6000 : 3200);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);

  useEffect(() => {
    externalToast = push;
    return () => {
      externalToast = () => {};
    };
  }, [push]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cn(
              "anim-sheet pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-sm",
              t.kind === "error" ? "border-negative/40 bg-surface text-fg" : "border-line bg-surface text-fg"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                t.kind === "error" ? "bg-negative" : t.kind === "success" ? "bg-positive" : "bg-fg-3"
              )}
            />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="text-sm font-medium text-accent hover:underline"
                onClick={() => {
                  t.action?.onClick();
                  setToasts((x) => x.filter((y) => y.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              className="text-fg-3 hover:text-fg"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
