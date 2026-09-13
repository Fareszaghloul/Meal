"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ loading: boolean; msg: string | null }>({ loading: false, msg: null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendStatus({ loading: false, msg: null });
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sign in");
        if (data.needsEmailVerification) {
          setNeedsVerification(true);
        }
        setLoading(false);
        return;
      }

      login(data.user);
      router.push(from);
      router.refresh();
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendStatus({ loading: true, msg: null });
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setResendStatus({ loading: false, msg: data.message || "Verification email sent!" });
    } catch {
      setResendStatus({ loading: false, msg: "Failed to send email" });
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mb-3 shadow-md bg-white">
          <Image src="/logo.png" alt="MealPrep logo" width={56} height={56} className="object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Welcome back
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Sign in to your MealPrep account
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs space-y-2">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {needsVerification && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus.loading}
                className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer disabled:opacity-50"
              >
                {resendStatus.loading ? "Sending link..." : "Click here to resend verification email"}
              </button>
              {resendStatus.msg && (
                <p className="text-[11px] text-emerald-500 mt-1 font-medium">{resendStatus.msg}</p>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-[var(--text-secondary)]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-xl shadow-md transition disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[var(--text-secondary)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          Sign up
        </Link>
      </div>


    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
