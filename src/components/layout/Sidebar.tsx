"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const { theme, setTheme, isDark } = useTheme();
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
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white">
              <Image src="/logo.png" alt="MealPrep logo" width={32} height={32} className="object-contain" />
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

        {/* Combined User Profile, 1-Click Theme Toggle & Logout */}
        <div className="p-3 border-t border-[var(--border)]">
          {user ? (
            <div className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between gap-2 shadow-xs">
              <Link
                href="/profile"
                className="flex items-center space-x-2.5 min-w-0 flex-1 hover:opacity-85 transition group"
                title="Profile & Settings"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold shrink-0 uppercase shadow-xs">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition">
                    {user.displayName || user.email?.split("@")[0]}
                  </div>
                  <div className="flex items-center space-x-1">
                    {user.role === "admin" ? (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)] truncate">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition cursor-pointer"
                  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between gap-2 shadow-xs">
              <Link
                href="/login"
                className="text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition px-1"
              >
                Sign In
              </Link>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition cursor-pointer"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
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
