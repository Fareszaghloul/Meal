"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ loading: boolean; msg: string | null }>({ loading: false, msg: null });
  const [error, setError] = useState<string | null>(null);
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
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
      <div className="w-full max-w-md p-6 sm:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center mx-auto shadow-md">
          <Mail className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Check your email
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            We sent a verification link to <strong className="text-[var(--text-primary)]">{registeredEmail}</strong>.
            Please click the link in the email to activate your account before signing in.
          </p>
        </div>


        <div className="pt-2 space-y-3">
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
          >
            <span>Proceed to Sign In</span>
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
              <p className="text-[11px] text-emerald-500 mt-1">{resendStatus.msg}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mb-3 shadow-md bg-white">
          <Image src="/logo.png" alt="MealPrep logo" width={56} height={56} className="object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Create an account
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Start your personalized meal planning journey
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            Full name / Display name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="name"
              name="name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex Johnson"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>
        </div>

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
              placeholder="alex@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            Password (min. 8 characters)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            Confirm password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
