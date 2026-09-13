"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));

  if (isAuthPage) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--background)]">
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <MobileNav />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </>
  );
}
