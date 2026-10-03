"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TextField, Spinner } from "@/components/ui/primitives";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get("from") || "/";
  // Only same-site paths; "//evil.com" and absolute URLs fall back to home.
  const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't sign in.");
        setLoading(false);
        return;
      }
      login(data.user);
      router.push(from);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="card w-full max-w-sm p-6">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-fg text-sm font-semibold text-bg">M</span>
        <span className="text-base font-semibold tracking-tight">MealPrep</span>
      </div>
      <h1 className="text-lg font-semibold">Sign in</h1>
      <p className="mb-5 text-sm text-fg-2">Accounts are created by the administrator.</p>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-negative/40 bg-negative-soft px-3 py-2 text-sm text-fg">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField id="email" name="email" type="email" label="Email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField id="password" name="password" type="password" label="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Spinner className="border-on-accent" /> : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="skeleton h-72 w-full max-w-sm" />}>
      <LoginForm />
    </Suspense>
  );
}
