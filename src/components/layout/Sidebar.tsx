"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Flame,
  ShoppingCart,
  Apple,
  Settings,
  Plus,
  Sun,
  Moon,
  Scale,
  Users,
  LogOut,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { QuickAddModal } from "./QuickAddModal";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Recipes", href: "/recipes", icon: BookOpen },
  { label: "Meal Plan", href: "/meal-plan", icon: CalendarDays },
  { label: "Meal Prep", href: "/meal-prep", icon: Flame },
  { label: "Shopping List", href: "/shopping-list", icon: ShoppingCart },
  { label: "Weight Log", href: "/weight", icon: Scale },
  { label: "Foods & Pantry", href: "/foods", icon: Apple },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { setTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 bg-transparent h-screen sticky top-0 shrink-0 z-30 select-none p-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 py-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-[34px] h-[34px] rounded-xl bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center font-bold text-base shadow-none shrink-0 transition-transform group-hover:scale-105">
              M
            </div>
            <div>
              <span className="font-semibold tracking-tight text-[var(--text-primary)] text-base">
                MealPrep
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Add Button */}
        <div className="pt-2 pb-3">
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-[var(--on-accent)] font-medium text-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 min-h-[44px] rounded-full text-xs font-medium transition",
                  isActive
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/50"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors shrink-0",
                    isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <div className="pt-4 space-y-1">
              <div className="px-4 text-[11px] font-medium text-[var(--text-muted)]">
                Admin
              </div>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center space-x-3 px-4 min-h-[44px] rounded-full text-xs font-medium transition",
                  pathname === "/admin" || pathname.startsWith("/admin/")
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/50"
                )}
              >
                <Users
                  className={cn(
                    "w-4 h-4 transition-colors shrink-0",
                    pathname === "/admin" || pathname.startsWith("/admin/")
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-secondary)]"
                  )}
                />
                <span>Users & accounts</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Profile Link & Settings at bottom */}
        <div className="pt-3">
          {user ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-[var(--surface)]">
              <Link
                href="/profile"
                className="flex items-center space-x-3 min-w-0 flex-1 hover:opacity-85 transition group"
                title="Profile & account"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user.displayName || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    Profile & account
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-[var(--lime)]" />
                  ) : (
                    <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-[var(--surface)]">
              <Link
                href="/login"
                className="text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition px-2"
              >
                Sign In
              </Link>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-[var(--lime)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
              </button>
            </div>
          )}
        </div>
      </aside>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </>
  );
}
