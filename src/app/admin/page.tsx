"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  Users,
  Key,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  RefreshCw,
  BookOpen,
  UserPlus,
  Search,
  ShieldCheck,
  Filter,
  Lock,
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
      <div className="p-8 text-center max-w-md mx-auto bg-[var(--surface)] border border-red-500/30 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Access Forbidden</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          You do not have administrative privileges to view this page. All administrative operations are enforced on the server.
        </p>
      </div>
    );
  }

  const handleToggleStatus = async (targetUser: AdminUserItem) => {
    const newStatus = targetUser.status === "active" ? "disabled" : "active";
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
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              User Management
            </h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Add people, create isolated accounts with separate data, and manage user permissions
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New User</span>
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-[var(--surface)] hover:bg-[var(--background)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] rounded-xl transition cursor-pointer"
            title="Refresh user list"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Data Isolation Guarantee Callout */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs flex items-start space-x-3.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            Separate & Isolated Personal Data
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            Every user account created operates in its own separate data space. Recipes, meal plans, pantry inventory, body weight & InBody measurements, and settings are completely private to each person.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center space-x-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{totalUsers}</div>
            <div className="text-xs text-[var(--text-secondary)]">Registered Accounts</div>
          </div>
        </div>

        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center space-x-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{activeSessions}</div>
            <div className="text-xs text-[var(--text-secondary)]">Active Sessions</div>
          </div>
        </div>

        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center space-x-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{totalRecipes}</div>
            <div className="text-xs text-[var(--text-secondary)]">User Recipes Created</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Users Table Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs space-y-3">
        {/* Table Header Controls: Search & Filters */}
        <div className="p-4 sm:p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">User Accounts</h2>
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border)]">
              {filteredUsers.length} of {users.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
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
            <div className="py-12 text-center space-y-2">
              <Users className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">No matching users found</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Try adjusting your search query or filters.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--accent)] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create New User</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Recipes</th>
                  <th className="px-5 py-3">Sessions</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === user?.id;
                  const isBusy = operatingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-[var(--background)]/50 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-xs">
                            {u.displayName?.charAt(0) || u.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--text-primary)]">
                              {u.displayName || "No Name"}
                              {isCurrent && (
                                <span className="ml-1.5 text-[10px] text-[var(--accent)] font-medium">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
                            u.role === "admin"
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]"
                          )}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center space-x-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
                            u.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-red-500/10 text-red-500"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              u.status === "active" ? "bg-emerald-500" : "bg-red-500"
                            )}
                          />
                          <span>{u.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-[var(--text-primary)]">
                        {u._count?.recipes ?? 0}
                      </td>

                      <td className="px-5 py-4 font-mono text-[var(--text-primary)]">
                        {u._count?.sessions ?? 0}
                      </td>

                      <td className="px-5 py-4 text-[var(--text-muted)] whitespace-nowrap font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center space-x-2">
                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent || isBusy}
                            className={cn(
                              "p-1.5 rounded-lg border border-[var(--border)] transition cursor-pointer disabled:opacity-30",
                              u.status === "active"
                                ? "text-red-500 hover:bg-red-500/10"
                                : "text-emerald-500 hover:bg-emerald-500/10"
                            )}
                            title={u.status === "active" ? "Disable account" : "Enable account"}
                          >
                            {u.status === "active" ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Change Role */}
                          <button
                            onClick={() => handleChangeRole(u)}
                            disabled={isCurrent || isBusy}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer disabled:opacity-30"
                            title="Toggle role (user/admin)"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent || isBusy}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-30"
                            title="Delete user permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
