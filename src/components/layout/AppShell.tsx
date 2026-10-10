"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CloudOff,
  LayoutList,
  LogOut,
  Moon,
  MoreHorizontal,
  User as UserIcon,
  Scale,
  Settings,
  ShoppingCart,
  Sun,
  Users,
  Utensils,
  Warehouse,
  Flame,
  Sunrise,
  LayoutDashboard,
  ChefHat,
  Plus,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { useSyncStatus } from "@/lib/client/day-store";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import { QuickAddSheet } from "./QuickAddSheet";

const AUTH_PATHS = ["/login"];

const PRIMARY = [
  { label: "Today", href: "/", icon: Sunrise },
  { label: "History", href: "/history", icon: CalendarDays },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Weight", href: "/weight", icon: Scale },
  { label: "Foods", href: "/foods", icon: Utensils },
  { label: "Recipes", href: "/recipes", icon: BookOpen },
];

const MORE = [
  { label: "Saved meals", href: "/saved-meals", icon: Utensils },
  { label: "Meal plan", href: "/meal-plan", icon: LayoutList },
  { label: "Weekly review", href: "/weekly-review", icon: CalendarCheck },
  { label: "Meal prep", href: "/meal-prep", icon: Flame },
  { label: "Shopping list", href: "/shopping-list", icon: ShoppingCart },
  { label: "Pantry", href: "/pantry", icon: Warehouse },
];

/** Phone tab bar: the daily loop around a raised "+". Everything else lives under More. */
const TABS_LEFT = [
  { label: "Today", href: "/", icon: LayoutDashboard },
  { label: "History", href: "/history", icon: CalendarDays },
];
const TABS_RIGHT = [{ label: "Recipes", href: "/recipes", icon: ChefHat }];
const TABS = [...TABS_LEFT, ...TABS_RIGHT];

const MORE_GROUPS = [
  { title: "Track", items: [PRIMARY[2], PRIMARY[3], PRIMARY[4]] },
  { title: "Plan & cook", items: [MORE[1], MORE[0], MORE[3], MORE[4], MORE[2], MORE[5]] },
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
  const { serverError } = useAuth();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    setMoreOpen(false);
    setQuickAddOpen(false);
  }, [pathname]);

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
        {/* Phone: no title bar (each screen carries its own heading). Only the sync status and the safe-area inset live here. */}
        <header className="safe-top flex items-center justify-end px-4 md:hidden">
          <SyncBadgeDot />
        </header>

        {serverError && (
          <div className="mx-auto w-full max-w-5xl px-3 pt-3 sm:px-5 md:px-8">
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-carbs">
              <CloudOff className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          </div>
        )}

        <main className="pb-tabbar mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 pt-3 sm:px-5 sm:pt-4 md:px-8 md:pb-10 md:pt-8">{children}</main>

        {/* Mobile bottom tabs: Today, History, raised "+", Recipes, More */}
        <nav aria-label="Primary" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
            {TABS_LEFT.map((i) => (
              <TabLink key={i.href} {...i} active={isActive(pathname, i.href)} />
            ))}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={quickAddOpen}
                aria-label="Add"
                className="-mt-5 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_0_0_6px_var(--bg)] transition-transform active:scale-95"
              >
                <Plus className="h-7 w-7" strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>
            {TABS_RIGHT.map((i) => (
              <TabLink key={i.href} {...i} active={isActive(pathname, i.href)} />
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px]",
                !TABS.some((t) => isActive(pathname, t.href)) ? "font-semibold text-fg" : "font-medium text-fg-3"
              )}
            >
              <MoreHorizontal className="h-[22px] w-[22px]" />
              More
            </button>
          </div>
        </nav>
      </div>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}

function TabLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px]", active ? "font-semibold text-fg" : "font-medium text-fg-3")}
    >
      <Icon className="h-[22px] w-[22px]" />
      {label}
    </Link>
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

/** Phone "More": every page that isn't a tab, plus account actions. A sheet, not a cramped dropdown. */
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { isDark, setTheme } = useTheme();
  const pathname = usePathname();
  const row = "flex min-h-[48px] items-center gap-3 rounded-md px-3 text-sm";
  const link = (href: string, label: string, Icon: React.ComponentType<{ className?: string }>) => {
    const active = isActive(pathname, href);
    return (
      <Link key={href} href={href} onClick={onClose} aria-current={active ? "page" : undefined} className={cn(row, active ? "bg-surface-2 font-medium text-fg" : "text-fg-2 hover:bg-surface-2")}>
        <Icon className="h-5 w-5 shrink-0 text-fg-3" />
        {label}
      </Link>
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title="More" size="sm">
      <nav aria-label="More" className="-mx-1 space-y-4">
        {MORE_GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-3">{g.title}</h3>
            {g.items.map((i) => link(i.href, i.label, i.icon))}
          </section>
        ))}
        <section>
          <h3 className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-3">Account</h3>
          {link("/settings", "Settings", Settings)}
          {link("/profile", user?.displayName || "Profile", UserIcon)}
          {user?.role === "admin" && link("/admin", "Accounts", Users)}
          <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className={cn(row, "w-full text-fg-2 hover:bg-surface-2")}>
            {isDark ? <Sun className="h-5 w-5 shrink-0 text-fg-3" /> : <Moon className="h-5 w-5 shrink-0 text-fg-3" />}
            {isDark ? "Light appearance" : "Dark appearance"}
          </button>
          <button type="button" onClick={() => logout()} className={cn(row, "w-full text-fg-2 hover:bg-surface-2")}>
            <LogOut className="h-5 w-5 shrink-0 text-fg-3" />
            Sign out
          </button>
        </section>
      </nav>
    </Sheet>
  );
}
