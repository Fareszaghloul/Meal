"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

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
    <div className="space-y-6 text-center">
      <div>
        <p className="text-sm text-[var(--text-muted)] font-normal">Account confirmation</p>
        <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          Email Verification
        </h1>
      </div>

      {loading && (
        <div className="py-12 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
          <p className="text-xs text-[var(--text-secondary)]">Verifying your email address...</p>
        </div>
      )}

      {!loading && success && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[var(--accent-subtle)] text-[var(--accent)] text-xs flex flex-col items-center space-y-2">
            <CheckCircle2 className="w-10 h-10" />
            <span className="font-semibold text-base">Your email has been verified!</span>
            <span className="text-xs text-[var(--text-secondary)]">Thank you for confirming your email address. Your account is fully secured.</span>
          </div>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center space-x-2 min-h-[44px] px-6 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition cursor-pointer"
          >
            <span>Go to dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {!loading && error && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[var(--macro-fat-bg)] text-[var(--status-over-target)] text-xs flex flex-col items-center space-y-2">
            <AlertCircle className="w-10 h-10" />
            <span className="font-semibold text-base">Verification Failed</span>
            <span className="text-xs">{error}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/profile"
              className="w-full inline-flex items-center justify-center space-x-2 min-h-[44px] px-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Request new link</span>
            </Link>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center min-h-[44px] px-5 bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-full transition cursor-pointer"
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
    <AuthLayout>
      <Suspense fallback={<div className="text-xs text-[var(--text-muted)]">Loading verification...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
