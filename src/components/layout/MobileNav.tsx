"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Users,
  LogOut,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { QuickAddModal } from "./QuickAddModal";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const DRAWER_ITEMS = [
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
  const { setTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  const isTabActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-transparent sticky top-0 z-30 select-none">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 h-10 -ml-1 rounded-2xl flex items-center justify-center text-[var(--text-secondary)] active:text-[var(--text-primary)] active:bg-[var(--surface)] cursor-pointer touch-manipulation transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center space-x-2.5 touch-manipulation">
            <div className="w-[30px] h-[30px] rounded-lg bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center font-bold text-sm shadow-none shrink-0">
              M
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-sm tracking-tight">
              MealPrep
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--text-secondary)] active:text-[var(--text-primary)] active:bg-[var(--surface)] transition cursor-pointer"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-[var(--lime)]" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </button>
      </header>

      {/* Slide-out Mobile Sidebar Drawer & Overlay */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 cursor-pointer touch-manipulation"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          <aside className="relative w-4/5 max-w-xs bg-[var(--surface)] h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200 p-4">
            <div className="flex items-center justify-between pb-4">
              <Link
                href="/"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center space-x-2.5"
              >
                <div className="w-[34px] h-[34px] rounded-xl bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center font-bold text-base shrink-0">
                  M
                </div>
                <div className="font-semibold text-[var(--text-primary)] text-base">
                  MealPrep
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] cursor-pointer touch-manipulation transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
              {DRAWER_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = isTabActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-4 min-h-[44px] rounded-full text-xs font-medium transition",
                      isActive
                        ? "bg-[var(--background)] text-[var(--text-primary)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--background)]/60 hover:text-[var(--text-primary)]"
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
                <div className="pt-3 space-y-1">
                  <div className="px-4 text-[11px] font-medium text-[var(--text-muted)]">
                    Admin
                  </div>
                  <Link
                    href="/admin"
                    onClick={() => setIsDrawerOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-4 min-h-[44px] rounded-full text-xs font-medium transition",
                      isTabActive("/admin")
                        ? "bg-[var(--background)] text-[var(--text-primary)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--background)]/60 hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Users
                      className={cn(
                        "w-4 h-4 transition-colors shrink-0",
                        isTabActive("/admin") ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                      )}
                    />
                    <span>Users & accounts</span>
                  </Link>
                </div>
              )}
            </nav>

            <div className="pt-3">
              {user ? (
                <div className="p-2.5 rounded-2xl bg-[var(--background)] flex items-center justify-between gap-2">
                  <Link
                    href="/profile"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex items-center space-x-2.5 min-w-0 flex-1"
                    title="Profile & account"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center text-xs font-bold shrink-0 uppercase">
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

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      logout();
                    }}
                    className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition cursor-pointer"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-2xl bg-[var(--background)] flex items-center justify-between">
                  <Link
                    href="/login"
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition px-2"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Floating Bottom Navigation Dock (16px from edges, 20px from bottom, rounded-26px, bg hero) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-5 left-4 right-4 z-40 max-w-md mx-auto rounded-[26px] bg-[var(--hero)] px-3 py-1.5 flex items-center justify-around shadow-2xl select-none"
      >
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-2xl text-[11px] font-medium transition touch-manipulation",
            pathname === "/"
              ? "text-[var(--lime)] font-semibold"
              : "text-[var(--hero-muted)] active:text-[var(--hero-text)]"
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Today</span>
        </Link>

        <Link
          href="/recipes"
          className={cn(
            "flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-2xl text-[11px] font-medium transition touch-manipulation",
            pathname.startsWith("/recipes")
              ? "text-[var(--lime)] font-semibold"
              : "text-[var(--hero-muted)] active:text-[var(--hero-text)]"
          )}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>Recipes</span>
        </Link>

        {/* Center Lime Round Add Button */}
        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="w-11 h-11 rounded-full bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer touch-manipulation shrink-0"
          aria-label="Add item or meal"
        >
          <Plus className="w-5 h-5" />
        </button>

        <Link
          href="/meal-plan"
          className={cn(
            "flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-2xl text-[11px] font-medium transition touch-manipulation",
            pathname.startsWith("/meal-plan")
              ? "text-[var(--lime)] font-semibold"
              : "text-[var(--hero-muted)] active:text-[var(--hero-text)]"
          )}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span>Plan</span>
        </Link>

        <Link
          href="/shopping-list"
          className={cn(
            "flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-2xl text-[11px] font-medium transition touch-manipulation",
            pathname.startsWith("/shopping-list")
              ? "text-[var(--lime)] font-semibold"
              : "text-[var(--hero-muted)] active:text-[var(--hero-text)]"
          )}
        >
          <ShoppingCart className="w-5 h-5 mb-0.5" />
          <span>Shopping</span>
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
