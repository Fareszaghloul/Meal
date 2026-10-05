"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  serverError: string | null;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_AUTH_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setServerError(null);
      } else if (res.status === 401) {
        setUser(null);
        setServerError(null);
        if (typeof window !== "undefined") {
          const pathname = window.location.pathname;
          const isPublic = PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
          if (!isPublic) {
            router.push("/login");
          }
        }
      } else {
        // Server or database error (500 / 503)
        const errData = await res.json().catch(() => null);
        console.error("Session check encountered server/database error:", errData || res.status);
        setServerError(errData?.error || "The database or server is temporarily unavailable.");
        // Do NOT wipe user session or redirect to login on server errors
      }
    } catch (err: any) {
      console.error("Network error during session check:", err);
      setServerError("Network error communicating with the server.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    router.push("/");
    router.refresh();
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    } finally {
      setUser(null);
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, serverError, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
