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
  Monitor,
  UtensilsCrossed,
  Scale,
  ShieldCheck,
  LogOut,
  User as UserIcon,
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
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const navItems = [
    ...NAV_ITEMS,
    ...(user?.role === "admin"
      ? [{ label: "Admin Console", href: "/admin", icon: ShieldCheck }]
      : []),
  ];

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--surface)] h-screen sticky top-0 shrink-0 z-30 select-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-[var(--text-primary)] text-base">
                MealPrep
              </span>
              <span className="ml-1.5 text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded">
                Cloud
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Add Button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 text-white font-medium text-xs transition group cursor-pointer"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            <span>+ Add</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
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
                  "flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition",
                  isActive
                    ? "bg-[var(--accent-subtle)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-secondary)]"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Theme footer */}
        <div className="p-3 border-t border-[var(--border)] space-y-2">
          {user && (
            <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
              <Link
                href="/profile"
                className="flex items-center space-x-2.5 min-w-0 flex-1 hover:opacity-80 transition"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user.displayName || user.email}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span
                      className={cn(
                        "text-[10px] uppercase font-semibold px-1 py-0.2 rounded",
                        user.role === "admin"
                          ? "bg-amber-500/10 text-amber-500"
                          : "text-[var(--text-muted)]"
                      )}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              </Link>

              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex-1 flex items-center justify-center py-1.5 rounded-lg transition cursor-pointer",
                theme === "light"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] font-medium border border-[var(--border)]"
                  : "hover:text-[var(--text-primary)]"
              )}
              title="Light mode"
            >
              <Sun className="w-3.5 h-3.5 mr-1" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex-1 flex items-center justify-center py-1.5 rounded-lg transition cursor-pointer",
                theme === "dark"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] font-medium border border-[var(--border)]"
                  : "hover:text-[var(--text-primary)]"
              )}
              title="Dark mode"
            >
              <Moon className="w-3.5 h-3.5 mr-1" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={cn(
                "flex-1 flex items-center justify-center py-1.5 rounded-lg transition cursor-pointer",
                theme === "system"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] font-medium border border-[var(--border)]"
                  : "hover:text-[var(--text-primary)]"
              )}
              title="System preference"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </>
  );
}
