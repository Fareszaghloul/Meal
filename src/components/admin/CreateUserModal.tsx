"use client";

import React, { useState } from "react";
import {
  X,
  UserPlus,
  Mail,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [emailVerified, setEmailVerified] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    displayName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `MealPrep Account Created:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          emailVerified,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create user");
      } else {
        setCreatedCredentials({
          email: email.trim().toLowerCase(),
          password,
          displayName: displayName.trim(),
        });
        onSuccess();
      }
    } catch {
      setErrorMsg("A network error occurred while creating the user.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setDisplayName("");
    setEmail("");
    setPassword("");
    setRole("user");
    setEmailVerified(true);
    setCreatedCredentials(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={handleResetAndClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[var(--surface)] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Create User Account
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Isolated workspace with private database records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Modal View */}
        {createdCredentials ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] space-y-1">
              <div className="flex items-center space-x-2 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Account Created Successfully!</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                The account has been created with its own isolated database profile, recipes, and meal plans.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--background)] space-y-2.5 text-xs">
              <div>
                <span className="text-xs text-[var(--text-muted)]">Display name</span>
                <p className="font-medium text-sm text-[var(--text-primary)]">{createdCredentials.displayName}</p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">Email</span>
                <p className="font-medium text-sm text-[var(--text-primary)] font-mono">{createdCredentials.email}</p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">Password</span>
                <p className="font-medium text-sm text-[var(--text-primary)] font-mono">{createdCredentials.password}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center space-x-2 min-h-[44px] bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-xs font-semibold text-[var(--text-primary)] rounded-full transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-[var(--accent)]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy details"}</span>
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="flex-1 inline-flex items-center justify-center min-h-[44px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-[var(--macro-fat-bg)] text-[var(--status-over-target)] text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Display Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Full name / Display name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Miller"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 min-h-[44px] rounded-2xl bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
                <UserIcon className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 min-h-[44px] rounded-2xl bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
                <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Temporary password
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs text-[var(--accent)] hover:underline inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate password</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 min-h-[44px] rounded-2xl bg-[var(--background)] text-sm font-mono text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
                <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role and Verified Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Account role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "user" | "admin")}
                  className="w-full px-4 min-h-[44px] rounded-2xl bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
                >
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center space-x-2 text-xs text-[var(--text-primary)] cursor-pointer py-3">
                  <input
                    type="checkbox"
                    checked={emailVerified}
                    onChange={(e) => setEmailVerified(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-[var(--accent)] cursor-pointer"
                  />
                  <span className="text-xs font-medium">Pre-verify account</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end space-x-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-5 min-h-[44px] rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--background)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 px-6 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>Create account</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
