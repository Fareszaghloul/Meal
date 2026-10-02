"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, AlertCircle, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process request");
        setLoading(false);
        return;
      }

      setSuccessMsg(data.message);
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
      setLoading(false);
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">Account recovery</p>
          <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Forgot Password
          </h1>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-[var(--macro-fat-bg)] text-[var(--status-over-target)] text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>

            {resetToken && (
              <div className="p-4 rounded-2xl bg-[var(--surface)] text-xs space-y-2">
                <div className="font-semibold text-[var(--text-primary)]">
                  Local Environment Demo Link:
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  No SMTP is configured in local dev, so you can use this direct link to complete the password reset:
                </p>
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  className="w-full inline-flex items-center justify-center space-x-2 min-h-[44px] px-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition"
                >
                  <span>Proceed to reset password</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Account email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                  <span>Send reset instructions</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-3">
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
