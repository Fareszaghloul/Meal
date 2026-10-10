"use client";

import { useEffect } from "react";

/**
 * Publishes the visual viewport to CSS so sheets fit above the on-screen keyboard:
 *   --vvh  visible height (shrinks when the keyboard opens; iOS doesn't shrink dvh for it)
 *   --kb   keyboard height (how far a bottom-anchored sheet must be lifted)
 * Also keeps a focused field inside a dialog visible once the keyboard has opened.
 */
export function ViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    const update = () => {
      if (!vv) return;
      root.style.setProperty("--vvh", `${vv.height}px`);
      root.style.setProperty("--kb", `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
    };
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el?.matches?.("input, select, textarea") || !el.closest('[role="dialog"], .modal-panel')) return;
      window.setTimeout(() => el.scrollIntoView({ block: "nearest" }), 300); // after the keyboard animation
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    document.addEventListener("focusin", onFocus);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);
  return null;
}
