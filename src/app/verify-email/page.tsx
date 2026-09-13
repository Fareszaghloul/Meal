"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail, UtensilsCrossed } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No verification token found in link.");
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok) {
          setSuccess(true);
        } else {
          setError(data.error || "Failed to verify email address.");
        }
      } catch {
        setError("Network error while verifying email.");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl text-center">
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center mb-3 shadow-md">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Email Verification
        </h1>
      </div>

      {loading && (
        <div className="py-8 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
          <p className="text-xs text-[var(--text-secondary)]">Verifying your email address...</p>
        </div>
      )}

      {!loading && success && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex flex-col items-center space-y-2">
            <CheckCircle2 className="w-8 h-8" />
            <span className="font-semibold text-sm">Your email has been verified!</span>
            <span className="text-[11px] opacity-90">Thank you for confirming your email address. Your account is fully secured.</span>
          </div>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {!loading && error && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex flex-col items-center space-y-2">
            <AlertCircle className="w-8 h-8" />
            <span className="font-semibold text-sm">Verification Failed</span>
            <span className="text-[11px] opacity-90">{error}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              href="/profile"
              className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Request New Link</span>
            </Link>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center py-2.5 px-4 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-xs text-[var(--text-muted)]">Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
