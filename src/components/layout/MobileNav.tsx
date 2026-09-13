"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ShoppingCart,
  Plus,
  Apple,
  Settings,
  Menu,
  X,
  Flame,
  Scale,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
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

export function MobileNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const drawerNavItems = [
    ...NAV_ITEMS,
    ...(user?.role === "admin"
      ? [{ label: "Admin Console", href: "/admin", icon: ShieldCheck }]
      : []),
  ];

  // Close drawer on path change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header
        suppressHydrationWarning
        className="md:hidden flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30 select-none"
      >
        <div className="flex items-center space-x-2" suppressHydrationWarning>
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-[var(--text-secondary)] active:text-[var(--text-primary)] active:bg-[var(--background)] cursor-pointer touch-manipulation transition"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center space-x-2 touch-manipulation">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white">
              <Image src="/logo.png" alt="MealPrep logo" width={28} height={28} className="object-contain" />
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-sm tracking-tight">
              MealPrep
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-2" suppressHydrationWarning>
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="h-9 px-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer touch-manipulation transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </header>

      {/* Slide-out Mobile Sidebar Drawer & Overlay */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Semi-transparent Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 cursor-pointer touch-manipulation"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel (Sliding in from left) */}
          <aside 
            id="mobile-menu-drawer"
            className="relative w-4/5 max-w-xs bg-[var(--surface)] border-r border-[var(--border)] h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
              <Link
                href="/"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center space-x-2.5 touch-manipulation"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white">
                  <Image src="/logo.png" alt="MealPrep logo" width={32} height={32} className="object-contain" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-primary)] text-sm leading-tight">
                    MealPrep
                  </div>
                  <div className="text-[10px] text-[var(--accent)] font-medium">
                    Personal Nutrition
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] active:text-[var(--text-primary)] active:bg-[var(--background)] cursor-pointer touch-manipulation transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add Button inside drawer */}
            <div className="px-4 pt-3 pb-2">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsQuickAddOpen(true);
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Item or Meal</span>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              {drawerNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition",
                      isActive
                        ? "bg-[var(--accent-subtle)] text-[var(--text-primary)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-colors shrink-0",
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

            {/* User Profile Card & Theme in Drawer Footer */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--background)]/40 space-y-2.5">
              {user && (
                <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                  <Link
                    href="/profile"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex items-center space-x-2.5 min-w-0 flex-1"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {user.displayName || user.email}
                      </div>
                      {user.role === "admin" && (
                        <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-amber-500/15 text-amber-500">
                          Admin
                        </span>
                      )}
                    </div>
                  </Link>

                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      logout();
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1.5 px-1">
                  Appearance
                </div>
                <div className="flex items-center justify-between p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition",
                      theme === "light"
                        ? "bg-[var(--background)] text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                    title="Light mode"
                  >
                    <Sun className="w-3.5 h-3.5 mr-1" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition",
                      theme === "dark"
                        ? "bg-[var(--background)] text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                    title="Dark mode"
                  >
                    <Moon className="w-3.5 h-3.5 mr-1" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={cn(
                      "flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition",
                      theme === "system"
                        ? "bg-[var(--background)] text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                    title="System preference"
                  >
                    <Monitor className="w-3.5 h-3.5 mr-1" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Bottom Mobile Navigation Bar */}
      <nav
        suppressHydrationWarning
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] px-2 pt-1 flex items-center justify-around select-none mobile-bottom-nav"
      >
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 min-w-[54px] min-h-[44px] rounded-xl text-[11px] font-medium touch-manipulation transition",
            pathname === "/"
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-secondary)] active:text-[var(--text-primary)]"
          )}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </Link>

        <Link
          href="/recipes"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 min-w-[54px] min-h-[44px] rounded-xl text-[11px] font-medium touch-manipulation transition",
            pathname.startsWith("/recipes")
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-secondary)] active:text-[var(--text-primary)]"
          )}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>Recipes</span>
        </Link>

        {/* Center Quick Add Floating Button */}
        <button
          suppressHydrationWarning
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="relative -top-3 w-12 h-12 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg active:scale-90 cursor-pointer touch-manipulation transition"
          aria-label="Add item"
        >
          <Plus className="w-5 h-5" />
        </button>

        <Link
          href="/meal-plan"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 min-w-[54px] min-h-[44px] rounded-xl text-[11px] font-medium touch-manipulation transition",
            pathname.startsWith("/meal-plan")
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-secondary)] active:text-[var(--text-primary)]"
          )}
        >
          <CalendarDays className="w-4 h-4 mb-0.5" />
          <span>Plan</span>
        </Link>

        <Link
          href="/shopping-list"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 min-w-[54px] min-h-[44px] rounded-xl text-[11px] font-medium touch-manipulation transition",
            pathname.startsWith("/shopping-list")
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-secondary)] active:text-[var(--text-primary)]"
          )}
        >
          <ShoppingCart className="w-4 h-4 mb-0.5" />
          <span>Shop</span>
        </Link>
      </nav>

      {/* Global Quick Add Modal on mobile */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </>
  );
}
