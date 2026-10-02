"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, AlertCircle, ArrowRight, Loader2, Key } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function RegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isInviteRequired, setIsInviteRequired] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ loading: boolean; msg: string | null }>({ loading: false, msg: null });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    // Check if invite code is required by server
    fetch("/api/auth/register")
      .then((res) => res.json())
      .then((data) => {
        if (data.inviteRequired) {
          setIsInviteRequired(true);
        }
      })
      .catch(() => {});

    // Auto-fill from query params if ?code=...
    if (typeof window !== "undefined") {
      const codeFromUrl = new URLSearchParams(window.location.search).get("code");
      if (codeFromUrl) {
        setInviteCode(codeFromUrl.trim());
      }
    }
  }, []);

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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          inviteCode: inviteCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      setRegisteredEmail(data.email || email.trim());
      setLoading(false);
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResendStatus({ loading: true, msg: null });
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const data = await res.json();
      setResendStatus({ loading: false, msg: data.message || "Verification link sent!" });
    } catch {
      setResendStatus({ loading: false, msg: "Failed to resend verification email" });
    }
  };

  if (registeredEmail) {
    return (
      <AuthLayout>
        <div className="space-y-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Check your email
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              We sent a verification link to <strong className="text-[var(--text-primary)]">{registeredEmail}</strong>.
              Please click the link in the email to activate your account.
            </p>
          </div>

          <div className="pt-2 space-y-4">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center space-x-2 min-h-[44px] px-6 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition cursor-pointer"
            >
              <span>Proceed to sign in</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <div>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus.loading}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer disabled:opacity-50"
              >
                {resendStatus.loading ? "Resending..." : "Didn't receive an email? Resend"}
              </button>
              {resendStatus.msg && (
                <p className="text-xs text-[var(--accent)] mt-1.5">{resendStatus.msg}</p>
              )}
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Brand Header */}
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">Get started</p>
          <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Create Account
          </h1>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-[var(--macro-fat-bg)] text-[var(--status-over-target)] text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Full name / Display name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="name"
                name="name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full pl-11 pr-4 min-h-[44px] bg-[var(--surface)] rounded-2xl text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full pl-11 pr-4 min-h-[44px] bg-[var(--surface)] rounded-2xl text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Password (min. 8 characters)
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
              Confirm password
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

          {isInviteRequired && (
            <div>
              <label
                htmlFor="inviteCode"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Invitation code <span className="text-[var(--accent)]">*</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter private invite code"
                  className="w-full pl-11 pr-4 min-h-[44px] bg-[var(--surface)] rounded-2xl text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Registration requires an invitation code.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center space-x-2 min-h-[44px] px-6 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-sm font-semibold rounded-full transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-[var(--text-secondary)] pt-2">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
