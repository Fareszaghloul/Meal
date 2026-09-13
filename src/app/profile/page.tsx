"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Scale,
  Activity,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WeightTrendChart } from "@/components/weight/WeightTrendChart";
import { BodyFatTrendChart, BodyFatDataPoint } from "@/components/profile/BodyFatTrendChart";
import { LogWeightModal } from "@/components/weight/LogWeightModal";
import { ProcessedWeightPoint, WeightAnalyticsSummary } from "@/lib/nutrition/weight-analytics";

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

  // Body & Health profile state
  const [birthDate, setBirthDate] = useState<string>("");
  const [calculatedAge, setCalculatedAge] = useState<number>(28);
  const [heightCm, setHeightCm] = useState<number | string>(178);
  const [heightFeet, setHeightFeet] = useState<number | string>(5);
  const [heightInches, setHeightInches] = useState<number | string>(10);
  const [currentWeightInput, setCurrentWeightInput] = useState<number | string>(78);
  const [bodyFatPct, setBodyFatPct] = useState<number | string>("");
  const [sex, setSex] = useState<string>("male");
  const [measurementSystem, setMeasurementSystem] = useState<string>("metric");
  const [goalWeightKg, setGoalWeightKg] = useState<number | null>(null);
  const [bodyMsg, setBodyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);

  // Weight & InBody Analytics & Chart state
  const [weightEntries, setWeightEntries] = useState<ProcessedWeightPoint[]>([]);
  const [weightAnalytics, setWeightAnalytics] = useState<WeightAnalyticsSummary | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

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

  const isImperial = measurementSystem === "imperial";
  const weightUnit = isImperial ? "lbs" : "kg";
  const heightUnit = isImperial ? "ft/in" : "cm";

  // Sync displayName when user is loaded
  useEffect(() => {
    if (user?.displayName && !displayName) {
      setDisplayName(user.displayName);
    }
  }, [user, displayName]);

  // Load User Settings & Body Profile
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setMeasurementSystem(data.measurementSystem ?? "metric");
        setSex(data.sex ?? "male");
        setBirthDate(data.birthDate ?? "");
        setCalculatedAge(data.age ?? 28);
        setBodyFatPct(data.currentBodyFatPct !== null && data.currentBodyFatPct !== undefined ? data.currentBodyFatPct : "");
        setGoalWeightKg(data.goalWeightKg ?? null);

        const isImp = data.measurementSystem === "imperial";
        const hCm = data.heightCm ?? 178;
        if (isImp) {
          const totalInches = Math.round(hCm / 2.54);
          setHeightFeet(Math.floor(totalInches / 12));
          setHeightInches(totalInches % 12);
          setHeightCm(totalInches);
        } else {
          setHeightCm(hCm);
        }

        const curWKg = data.currentWeightKg ?? 78;
        setCurrentWeightInput(isImp ? Math.round(curWKg * 2.20462 * 10) / 10 : curWKg);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  // Load Weight & InBody history
  const fetchWeightData = async () => {
    try {
      const res = await fetch("/api/weight");
      if (res.ok) {
        const data = await res.json();
        setWeightEntries(data.entries || []);
        setWeightAnalytics(data.analytics || null);
      }
    } catch (err) {
      console.error("Failed to load weight logs:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWeightData();
  }, []);

  // Compute age live when birthDate changes
  const computedAgeFromBirthDate = useMemo(() => {
    if (!birthDate) return calculatedAge;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return calculatedAge;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 && age < 125 ? age : calculatedAge;
  }, [birthDate, calculatedAge]);

  // Derived Body Composition Stats
  const weightKgNum = useMemo(() => {
    const val = Number(currentWeightInput);
    if (isNaN(val) || val <= 0) return 75;
    return isImperial ? Math.round((val / 2.20462) * 10) / 10 : val;
  }, [currentWeightInput, isImperial]);

  const bodyFatNum = useMemo(() => {
    const val = Number(bodyFatPct);
    return !isNaN(val) && val > 0 ? val : null;
  }, [bodyFatPct]);

  const fatMassKg = useMemo(() => {
    if (bodyFatNum === null) return null;
    return Math.round((weightKgNum * (bodyFatNum / 100)) * 10) / 10;
  }, [weightKgNum, bodyFatNum]);

  const leanMassKg = useMemo(() => {
    if (fatMassKg === null) return null;
    return Math.round((weightKgNum - fatMassKg) * 10) / 10;
  }, [weightKgNum, fatMassKg]);

  // Transform weight entries into InBody entries list for chart
  const inBodyEntries: BodyFatDataPoint[] = useMemo(() => {
    return weightEntries
      .filter((e) => typeof e.bodyFatPct === "number" && e.bodyFatPct > 0)
      .map((e) => ({
        id: e.id,
        date: e.date,
        bodyFatPct: e.bodyFatPct as number,
        weightKg: e.weightKg,
        notes: e.notes,
      }));
  }, [weightEntries]);

  // Handlers
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
        setInfoMsg({ type: "success", text: "Profile name updated!" });
        await refreshUser();
      }
    } catch {
      setInfoMsg({ type: "error", text: "An error occurred updating profile" });
    } finally {
      setInfoLoading(false);
    }
  };

  const handleSaveBodyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBodyMsg(null);
    setBodyLoading(true);

    try {
      let finalHeightCm = Number(heightCm);
      if (isImperial) {
        const ft = Number(heightFeet) || 0;
        const inch = Number(heightInches) || 0;
        finalHeightCm = Math.round((ft * 12 + inch) * 2.54);
      }

      const finalWeightKg = isImperial
        ? Math.round((Number(currentWeightInput) / 2.20462) * 10) / 10
        : Number(currentWeightInput);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sex,
          birthDate: birthDate || null,
          age: computedAgeFromBirthDate,
          heightCm: finalHeightCm,
          currentWeightKg: finalWeightKg,
          currentBodyFatPct: bodyFatPct !== "" ? Number(bodyFatPct) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setBodyMsg({ type: "error", text: data.error || "Failed to update body profile" });
      } else {
        setBodyMsg({ type: "success", text: "Body profile and metrics saved!" });
        await fetchSettings();
        await fetchWeightData();
      }
    } catch {
      setBodyMsg({ type: "error", text: "An error occurred while saving" });
    } finally {
      setBodyLoading(false);
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
        setPwdMsg({ type: "success", text: "Password changed successfully! Other sessions invalidated." });
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
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            User Profile & Body Metrics
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Manage your physical stats, birthday, monthly InBody scan tracking, and account security
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLogModalOpen(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Weigh-In / InBody</span>
        </button>
      </div>

      {/* Account Overview Header Card */}
      <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-5 pb-6 border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center text-xl font-bold uppercase shadow-sm shrink-0">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
                {user?.displayName || "User"}
              </h2>
              <span
                className={cn(
                  "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md shrink-0",
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
          </div>
        </div>

        {/* Quick Name Form */}
        <form onSubmit={handleUpdateProfile} className="mt-5 space-y-3 max-w-md">
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

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
              />
            </div>
            <div className="self-end">
              <button
                type="submit"
                disabled={infoLoading}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {infoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Body & Health Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-1">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
            Current Weight
          </span>
          <div className="text-xl font-bold text-[var(--text-primary)] font-tabular">
            {currentWeightInput || "—"} <span className="text-xs font-normal text-[var(--text-secondary)]">{weightUnit}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {weightAnalytics?.latest7dAvgKg ? `7-day avg: ${isImperial ? Math.round(weightAnalytics.latest7dAvgKg * 2.20462 * 10) / 10 : weightAnalytics.latest7dAvgKg} ${weightUnit}` : "Logged weight"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-1">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
            Body Fat (InBody)
          </span>
          <div className="text-xl font-bold text-sky-500 font-tabular">
            {bodyFatPct ? `${bodyFatPct}%` : "—"}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {inBodyEntries.length > 0 ? `${inBodyEntries.length} scan${inBodyEntries.length > 1 ? "s" : ""} recorded` : "Monthly scan"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-1">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
            Lean Body Mass
          </span>
          <div className="text-xl font-bold text-emerald-500 font-tabular">
            {leanMassKg !== null ? (
              <>
                {isImperial ? Math.round(leanMassKg * 2.20462 * 10) / 10 : leanMassKg}{" "}
                <span className="text-xs font-normal text-[var(--text-secondary)]">{weightUnit}</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            Muscle & lean tissue
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-1">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
            Total Fat Mass
          </span>
          <div className="text-xl font-bold text-amber-500 font-tabular">
            {fatMassKg !== null ? (
              <>
                {isImperial ? Math.round(fatMassKg * 2.20462 * 10) / 10 : fatMassKg}{" "}
                <span className="text-xs font-normal text-[var(--text-secondary)]">{weightUnit}</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            Body fat weight
          </span>
        </div>
      </div>

      {/* Body & Health Profile Form Card */}
      <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs space-y-5">
        <div className="flex items-center space-x-2">
          <Scale className="w-5 h-5 text-[var(--accent)]" />
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Body & Physical Profile</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Your birthday automatically increments your age every year. Height, weight, and InBody fat % tune your BMR and nutrition targets.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBodyProfile} className="space-y-4">
          {bodyMsg && (
            <div
              className={cn(
                "p-3 rounded-xl text-xs flex items-center space-x-2",
                bodyMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                  : "bg-red-500/10 border border-red-500/20 text-red-500"
              )}
            >
              {bodyMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{bodyMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Sex */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Biological Sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Birthday with Auto-Adjusting Age */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Birthday
                </label>
                <span className="text-[10px] font-semibold text-[var(--accent)] bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded">
                  Age: {computedAgeFromBirthDate} yrs
                </span>
              </div>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Automatically adjusts on your birthday
              </p>
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Height ({heightUnit})
              </label>
              {isImperial ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min={3}
                    max={7}
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    className="w-1/2 px-2 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                    placeholder="ft"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">ft</span>
                  <input
                    type="number"
                    min={0}
                    max={11}
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    className="w-1/2 px-2 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                    placeholder="in"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">in</span>
                </div>
              ) : (
                <input
                  type="number"
                  min={100}
                  max={250}
                  required
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                />
              )}
            </div>

            {/* Current Weight */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Current Weight ({weightUnit})
              </label>
              <input
                type="number"
                step="0.1"
                min={30}
                max={400}
                required
                value={currentWeightInput}
                onChange={(e) => setCurrentWeightInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
              />
            </div>

            {/* Body Fat % (InBody scan) */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Monthly InBody Body Fat %
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min={3}
                  max={60}
                  placeholder="e.g. 15.5"
                  value={bodyFatPct}
                  onChange={(e) => setBodyFatPct(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium">
                  %
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Updated from monthly scans
              </p>
            </div>

            {/* Measurement System Selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Measurement Units
              </label>
              <select
                value={measurementSystem}
                onChange={(e) => setMeasurementSystem(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              >
                <option value="metric">Metric (kg, cm)</option>
                <option value="imperial">Imperial (lbs, ft/in)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
            <Link
              href="/settings"
              className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>Adjust nutrition targets & TDEE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="submit"
              disabled={bodyLoading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {bodyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Body Profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* Visual Trends Section: Weight Trend & InBody Body Fat Graphs */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
            Composition & Progress Charts
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Visual graphs for your daily/weekly scale weight and monthly InBody body fat percentage scans
          </p>
        </div>

        {/* 1. Body Fat % InBody Trend Chart */}
        <BodyFatTrendChart entries={inBodyEntries} />

        {/* 2. Scale Weight Trend Chart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Weight Trend & 7-Day Average
            </h3>
            <Link
              href="/weight"
              className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>Open full weight log</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <WeightTrendChart
            entries={weightEntries}
            goalWeightKg={goalWeightKg}
            measurementSystem={measurementSystem}
          />
        </div>
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
            {pwdLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
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
          Permanently delete your account and all associated recipes, meal plans, pantry items, and logs. This action is irreversible.
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
                {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

      {/* Log Weight Modal with Body Fat input */}
      <LogWeightModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={() => {
          fetchWeightData();
          fetchSettings();
        }}
        measurementSystem={measurementSystem}
      />
    </div>
  );
}
