"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CloudOff,
  LayoutList,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Scale,
  Settings,
  ShoppingCart,
  Sun,
  Users,
  Utensils,
  Warehouse,
  X,
  Flame,
  Sunrise,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { useSyncStatus } from "@/lib/client/day-store";
import { cn } from "@/lib/utils";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

const PRIMARY = [
  { label: "Today", href: "/", icon: Sunrise },
  { label: "History", href: "/history", icon: CalendarDays },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Weight", href: "/weight", icon: Scale },
  { label: "Foods", href: "/foods", icon: Utensils },
  { label: "Recipes", href: "/recipes", icon: BookOpen },
];

const MORE = [
  { label: "Meal plan", href: "/meal-plan", icon: LayoutList },
  { label: "Meal prep", href: "/meal-prep", icon: Flame },
  { label: "Shopping list", href: "/shopping-list", icon: ShoppingCart },
  { label: "Pantry", href: "/pantry", icon: Warehouse },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[36px] items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
        active ? "bg-surface-2 font-medium text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-fg" : "text-fg-3")} />
      {label}
    </Link>
  );
}

function SyncBadge() {
  const { state, pending } = useSyncStatus();
  if (state === "idle" && pending === 0) return null;
  const text = state === "offline" ? `Offline · ${pending} pending` : state === "error" ? `Retrying · ${pending} pending` : "Saving…";
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs text-fg-2" role="status">
      {state === "offline" ? <CloudOff className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
      {text}
    </div>
  );
}

function NavSections({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(() => MORE.some((m) => isActive(pathname, m.href)));
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto" aria-label="Main">
      {PRIMARY.map((i) => (
        <NavLink key={i.href} {...i} onClick={onNavigate} />
      ))}
      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        aria-expanded={moreOpen}
        className="mt-3 flex w-full items-center justify-between px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-fg-3 hover:text-fg-2"
      >
        More
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")} />
      </button>
      {moreOpen && (
        <div className="space-y-0.5">
          {MORE.map((i) => (
            <NavLink key={i.href} {...i} onClick={onNavigate} />
          ))}
          {user?.role === "admin" && <NavLink href="/admin" label="Accounts" icon={Users} onClick={onNavigate} />}
        </div>
      )}
    </nav>
  );
}

function UserFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const { isDark, setTheme } = useTheme();
  const pathname = usePathname();
  return (
    <div className="space-y-1 border-t border-line pt-3">
      <SyncBadge />
      <NavLink href="/settings" label="Settings" icon={Settings} onClick={onNavigate} />
      <div className="flex items-center justify-between gap-2 px-2.5 pt-1">
        <Link href="/profile" onClick={onNavigate} className={cn("min-w-0 flex-1 truncate text-sm", isActive(pathname, "/profile") ? "text-fg" : "text-fg-2 hover:text-fg")}>
          {user?.displayName || user?.email || "Account"}
        </Link>
        <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className="btn btn-ghost btn-icon btn-sm" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => logout()} className="btn btn-ghost btn-icon btn-sm" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  if (isAuthPage) {
    return <main className="flex min-h-screen w-full items-center justify-center bg-bg p-4">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-surface p-3 md:flex">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2.5 pt-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-fg text-[13px] font-semibold text-bg">M</span>
          <span className="text-sm font-semibold tracking-tight">MealPrep</span>
        </Link>
        <NavSections />
        <UserFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 px-3 py-2 backdrop-blur-sm md:hidden">
          <button type="button" onClick={() => setDrawer(true)} className="btn btn-ghost btn-icon" aria-label="Open menu">
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link href="/" className="text-sm font-semibold tracking-tight">
            MealPrep
          </Link>
          <div className="w-9">
            <SyncBadgeDot />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">{children}</main>

        {/* Mobile bottom tabs */}
        <nav aria-label="Primary" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {[PRIMARY[0], PRIMARY[1], PRIMARY[4], PRIMARY[3], PRIMARY[2]].map((i) => {
              const active = isActive(pathname, i.href);
              const Icon = i.icon;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-[52px] min-w-[56px] flex-col items-center justify-center gap-0.5 text-[11px]", active ? "text-fg" : "text-fg-3")}
                >
                  <Icon className="h-5 w-5" />
                  {i.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} aria-hidden="true" />
          <aside className="anim-sheet absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface p-3" role="dialog" aria-label="Menu">
            <div className="mb-3 flex items-center justify-between px-2.5">
              <span className="text-sm font-semibold">MealPrep</span>
              <button type="button" onClick={() => setDrawer(false)} className="btn btn-ghost btn-icon btn-sm" aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavSections onNavigate={() => setDrawer(false)} />
            <UserFooter onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}

function SyncBadgeDot() {
  const { state, pending } = useSyncStatus();
  if (state === "idle" && pending === 0) return null;
  return (
    <span className="flex items-center justify-end" title={`${pending} pending`} role="status" aria-label={`${pending} changes pending`}>
      {state === "offline" ? <CloudOff className="h-4 w-4 text-fg-2" /> : <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />}
    </span>
  );
}
