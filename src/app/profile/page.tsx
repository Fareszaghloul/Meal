"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Lock,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();

  // Email verification state
  const [verificationStatus, setVerificationStatus] = useState<{
    loading: boolean;
    msg: string | null;
    type: "success" | "error" | null;
  }>({ loading: false, msg: null, type: null });

  // Profile info state
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [infoMsg, setInfoMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync displayName when user is loaded
  React.useEffect(() => {
    if (user?.displayName && !displayName) {
      setDisplayName(user.displayName);
    }
  }, [user, displayName]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg(null);
    setInfoLoading(true);

    try {
      const res = await fetch("/api/auth/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInfoMsg({ type: "error", text: data.error || "Failed to update profile" });
      } else {
        setInfoMsg({ type: "success", text: "Profile updated successfully!" });
        await refreshUser();
      }
    } catch {
      setInfoMsg({ type: "error", text: "An error occurred updating profile" });
    } finally {
      setInfoLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setPwdMsg({ type: "error", text: "Password must be at least 8 characters long" });
      return;
    }

    setPwdLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPwdMsg({ type: "error", text: data.error || "Failed to change password" });
      } else {
        setPwdMsg({ type: "success", text: "Password changed successfully! Other active sessions were invalidated." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPwdMsg({ type: "error", text: "An error occurred while changing password" });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteMsg(null);
    setDeleteLoading(true);

    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteMsg(data.error || "Failed to delete account");
        setDeleteLoading(false);
      } else {
        await logout();
      }
    } catch {
      setDeleteMsg("An error occurred during account deletion");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Account & Security
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Manage your personal profile, credentials, and account settings
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-5 pb-6 border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center text-xl font-bold uppercase shadow-sm">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {user?.displayName || "User"}
              </h2>
              <span
                className={cn(
                  "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                  user?.role === "admin"
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-[var(--accent-subtle)] text-[var(--accent)]"
                )}
              >
                {user?.role}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs text-[var(--text-secondary)]">{user?.email}</span>
              {user?.emailVerified ? (
                <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3 h-3" />
                  <span>Unverified</span>
                </span>
              )}
            </div>
            {user?.createdAt && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            )}
            {!user?.emailVerified && (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    setVerificationStatus({ loading: true, msg: null, type: null });
                    try {
                      const res = await fetch("/api/auth/send-verification", { method: "POST" });
                      const data = await res.json();
                      if (res.ok) {
                        setVerificationStatus({ loading: false, msg: data.message, type: "success" });
                      } else {
                        setVerificationStatus({ loading: false, msg: data.error || "Failed to send email", type: "error" });
                      }
                    } catch {
                      setVerificationStatus({ loading: false, msg: "Network error sending email", type: "error" });
                    }
                  }}
                  disabled={verificationStatus.loading}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[var(--background)] hover:bg-[var(--accent-subtle)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{verificationStatus.loading ? "Sending..." : "Send Verification Email"}</span>
                </button>
                {verificationStatus.msg && (
                  <p className={cn("text-[11px] mt-1.5 font-medium", verificationStatus.type === "success" ? "text-emerald-500" : "text-red-500")}>
                    {verificationStatus.msg}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Name Form */}
        <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4 max-w-md">
          {infoMsg && (
            <div
              className={cn(
                "p-3 rounded-xl text-xs flex items-center space-x-2",
                infoMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                  : "bg-red-500/10 border border-red-500/20 text-red-500"
              )}
            >
              {infoMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{infoMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>

          <button
            type="submit"
            disabled={infoLoading}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {infoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Profile</span>
          </button>
        </form>
      </div>

      {/* Password Change Card */}
      <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs">
        <div className="flex items-center space-x-2.5 mb-1">
          <KeyRound className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">Change Password</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-5">
          Updating your password will automatically invalidate your other active sessions for security.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {pwdMsg && (
            <div
              className={cn(
                "p-3 rounded-xl text-xs flex items-center space-x-2",
                pwdMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                  : "bg-red-500/10 border border-red-500/20 text-red-500"
              )}
            >
              {pwdMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{pwdMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              New Password (min. 8 characters)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>

          <button
            type="submit"
            disabled={pwdLoading}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {pwdLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>Update Password</span>
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="p-6 bg-[var(--surface)] border border-red-500/20 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-2.5 mb-1 text-red-500">
          <Trash2 className="w-5 h-5" />
          <h2 className="text-base font-bold">Delete Account</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Permanently delete your account and all associated recipes, meal plans, pantry items, and shopping lists. This action is irreversible.
        </p>

        {showDeleteConfirm ? (
          <form onSubmit={handleDeleteAccount} className="space-y-4 max-w-md pt-2">
            {deleteMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-red-500 mb-1.5">
                Confirm your password to delete your account:
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-red-500/30 rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-red-500 transition"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={deleteLoading}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {deleteLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Permanently Delete My Account</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Delete Account...
          </button>
        )}
      </div>
    </div>
  );
}
