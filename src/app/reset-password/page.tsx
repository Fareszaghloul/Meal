"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, KeyRound, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--text-muted)] font-normal">Security</p>
        <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          Reset Password
        </h1>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[var(--macro-fat-bg)] text-[var(--status-over-target)] text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] text-xs flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Password successfully reset! Redirecting to login...</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            <span>Click here if not redirected automatically</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="token"
              className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Reset token
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="token"
                name="token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token received"
                className="w-full pl-11 pr-4 min-h-[44px] bg-[var(--surface)] rounded-2xl text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
            >
              New password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 min-h-[44px] bg-[var(--surface)] rounded-2xl text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 min-h-[44px] bg-[var(--surface)] rounded-2xl text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center space-x-2 min-h-[44px] px-6 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-sm font-semibold rounded-full transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Set new password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
