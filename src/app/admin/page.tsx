"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  Users,
  Key,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
  RefreshCw,
  BookOpen,
  UserPlus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateUserModal } from "@/components/admin/CreateUserModal";

interface AdminUserItem {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  status: "active" | "disabled";
  createdAt: string;
  _count: {
    recipes: number;
    sessions: number;
    mealPlans?: number;
    weightEntries?: number;
  };
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [operatingId, setOperatingId] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");

  // Create User Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const data = await res.json();
        setActionError(data.error || "Failed to fetch users");
      }
    } catch {
      setActionError("Failed to communicate with admin endpoint");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchQuery ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  if (user && user.role !== "admin") {
    return (
      <div className="p-8 text-center max-w-md mx-auto bg-[var(--surface)] rounded-3xl space-y-4">
        <ShieldAlert className="w-12 h-12 text-[var(--status-over-target)] mx-auto" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Access Forbidden</h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          You do not have administrative privileges to view this page. All administrative operations are enforced on the server.
        </p>
      </div>
    );
  }

  const handleToggleStatus = async (targetUser: AdminUserItem) => {
    const newStatus = targetUser.status === "active" ? "suspended" : "active";
    setOperatingId(targetUser.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to update user status");
      } else {
        setActionSuccess(`User account marked as ${newStatus}`);
        await fetchUsers();
      }
    } catch {
      setActionError("Network error while updating user");
    } finally {
      setOperatingId(null);
    }
  };

  const handleResetPassword = async (targetUser: AdminUserItem) => {
    const password = window.prompt(`New password for ${targetUser.email} (at least 8 characters). Their other sessions will be signed out.`);
    if (password === null) return;
    if (password.length < 8) {
      setActionError("Password must be at least 8 characters");
      return;
    }
    setOperatingId(targetUser.id);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) setActionError(data.error || "Failed to reset password");
      else setActionSuccess(`Password updated for ${targetUser.email}`);
    } catch {
      setActionError("Network error while resetting password");
    } finally {
      setOperatingId(null);
    }
  };

  const handleChangeRole = async (targetUser: AdminUserItem) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    if (!confirm(`Are you sure you want to change ${targetUser.email}'s role to ${newRole}?`)) {
      return;
    }

    setOperatingId(targetUser.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to change user role");
      } else {
        setActionSuccess(`Role updated to ${newRole}`);
        await fetchUsers();
      }
    } catch {
      setActionError("Network error while updating role");
    } finally {
      setOperatingId(null);
    }
  };

  const handleDeleteUser = async (targetUser: AdminUserItem) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${targetUser.email}? All associated personal recipes, meal plans, pantry inventory, and weight records will be permanently erased.`
      )
    ) {
      return;
    }

    setOperatingId(targetUser.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to delete user");
      } else {
        setActionSuccess("User and their data were permanently deleted");
        await fetchUsers();
      }
    } catch {
      setActionError("Network error deleting user");
    } finally {
      setOperatingId(null);
    }
  };

  const totalUsers = users.length;
  const activeSessions = users.reduce((acc, u) => acc + (u._count?.sessions || 0), 0);
  const totalRecipes = users.reduce((acc, u) => acc + (u._count?.recipes || 0), 0);

  return (
    <div className="space-y-8 pb-16 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">Administration</p>
          <div className="flex items-center space-x-3">
            <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              User Management
            </h1>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
              Admin Only
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center space-x-2 px-5 min-h-[44px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add new user</span>
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center justify-center space-x-2 px-4 min-h-[44px] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--accent-subtle)] rounded-full transition cursor-pointer"
            title="Refresh user list"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Data Isolation Guarantee Callout */}
      <div className="p-6 rounded-3xl bg-[var(--surface)] flex items-start space-x-4">
        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Separate &amp; isolated personal data
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Every user account operates in its own isolated workspace. Recipes, meal plans, pantry inventory, body weight and InBody measurements, and settings are strictly private to each person.
          </p>
        </div>
      </div>

      {/* Metrics Row: 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 bg-[var(--surface)] rounded-3xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--background)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--text-primary)] font-tabular">{totalUsers}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Registered accounts</div>
          </div>
        </div>

        <div className="p-6 bg-[var(--surface)] rounded-3xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--background)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--text-primary)] font-tabular">{activeSessions}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Active sessions</div>
          </div>
        </div>

        <div className="p-6 bg-[var(--surface)] rounded-3xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--macro-protein-bg)] text-[var(--macro-protein)] flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--text-primary)] font-tabular">{totalRecipes}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Recipes created</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-[var(--macro-fat-bg)] text-[var(--status-over-target)] text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Users Table Card */}
      <div className="bg-[var(--surface)] rounded-3xl p-6 md:p-8 space-y-6">
        {/* Table Header Controls: Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">User Accounts</h2>
            <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--background)] px-3 py-1 rounded-full">
              {filteredUsers.length} of {users.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 min-h-[44px] rounded-full bg-[var(--background)] text-xs font-medium text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-4 min-h-[44px] rounded-full bg-[var(--background)] text-xs font-medium text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 min-h-[44px] rounded-full bg-[var(--background)] text-xs font-medium text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users className="w-10 h-10 text-[var(--text-muted)] opacity-40 mx-auto" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No matching users found</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Try adjusting your search query or filters.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 inline-flex items-center space-x-1.5 px-5 min-h-[44px] bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create new user</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[var(--text-muted)] font-normal border-b border-[var(--border)]">
                  <th className="pb-3 px-4">User</th>
                  <th className="pb-3 px-4">Role</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Recipes</th>
                  <th className="pb-3 px-4">Sessions</th>
                  <th className="pb-3 px-4">Created</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === user?.id;
                  const isBusy = operatingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-[var(--background)]/40 transition">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {u.displayName?.charAt(0) || u.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[var(--text-primary)]">
                              {u.displayName || "No Name"}
                              {isCurrent && (
                                <span className="ml-1.5 text-xs text-[var(--accent)] font-medium">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={cn(
                            "inline-block text-xs font-semibold px-3 py-1 rounded-full capitalize",
                            u.role === "admin"
                              ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                              : "bg-[var(--background)] text-[var(--text-secondary)]"
                          )}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center space-x-1.5 text-xs font-medium">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              u.status === "active" ? "bg-[var(--accent)]" : "bg-[var(--status-over-target)]"
                            )}
                          />
                          <span className="capitalize text-[var(--text-secondary)]">{u.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 font-tabular text-sm text-[var(--text-primary)]">
                        {u._count?.recipes ?? 0}
                      </td>

                      <td className="py-4 px-4 font-tabular text-sm text-[var(--text-primary)]">
                        {u._count?.sessions ?? 0}
                      </td>

                      <td className="py-4 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center space-x-2">
                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent || isBusy}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer disabled:opacity-30",
                              u.status === "active"
                                ? "bg-[var(--macro-fat-bg)] text-[var(--status-over-target)] hover:opacity-80"
                                : "bg-[var(--accent-subtle)] text-[var(--accent)] hover:opacity-80"
                            )}
                            title={u.status === "active" ? "Disable account" : "Enable account"}
                          >
                            {u.status === "active" ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>

                          {/* Change Role */}
                          <button
                            onClick={() => handleChangeRole(u)}
                            disabled={isCurrent || isBusy}
                            className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition cursor-pointer disabled:opacity-30"
                            title="Toggle role (user/admin)"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Reset password */}
                          <button
                            onClick={() => handleResetPassword(u)}
                            disabled={isBusy}
                            className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition cursor-pointer disabled:opacity-30"
                            title="Set a new password"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent || isBusy}
                            className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--status-over-target)] hover:bg-[var(--macro-fat-bg)] transition cursor-pointer disabled:opacity-30"
                            title="Delete user permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create User Account Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchUsers();
        }}
      />
    </div>
  );
}
