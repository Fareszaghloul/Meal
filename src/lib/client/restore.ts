"use client";

import { discardOutbox } from "@/lib/client/day-store";

/**
 * The one invalidation path after a successful FULL restore. Every dataset changed at once (Today, Food Library,
 * Recipes, History, Weight, Analytics, Settings), so instead of chasing each in-memory cache this drops the persisted
 * write queue (it targets records that no longer exist) and does one controlled full navigation, which resets every
 * module-level client cache.
 */
export function afterFullRestore() {
  discardOutbox();
  // Intended full navigation: every client cache must reset after the whole dataset changed.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/");
}
