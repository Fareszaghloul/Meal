"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Scale,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Lock,
  ArrowRight,
  Plus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WeightChart } from "@/components/weight/WeightChart";
import { BodyFatTrendChart, BodyFatDataPoint } from "@/components/profile/BodyFatTrendChart";
import { LogWeightModal } from "@/components/weight/LogWeightModal";
import { invalidateAll } from "@/lib/client/day-store";
import { rangeFrom, useWeightData, type WeightRange } from "@/lib/client/weight-store";
import { formatWeight, toKg, weightInputValue, weightUnitFor } from "@/lib/weight-units";

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();

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
  const [currentWeightInput, setCurrentWeightInput] = useState<number | string>("");
  const [bodyFatPct, setBodyFatPct] = useState<number | string>("");
  const [smmInput, setSmmInput] = useState<number | string>("");
  const [bmiInput, setBmiInput] = useState<number | string>("");
  const [sex, setSex] = useState<string>("male");
  const [measurementSystem, setMeasurementSystem] = useState<string>("metric");
  const [goalWeightKg, setGoalWeightKg] = useState<number | null>(null);
  const [bodyMsg, setBodyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);

  // Weight & InBody Analytics & Chart state
  const [weightRange, setWeightRange] = useState<WeightRange>("90");
  const { data: weightData } = useWeightData(weightRange);
  const [weightFromLog, setWeightFromLog] = useState(false);
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
  const weightUnit = weightUnitFor(measurementSystem);
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

        if (data.currentSmmKg !== null && data.currentSmmKg !== undefined) {
          setSmmInput(weightInputValue(data.currentSmmKg, weightUnitFor(data.measurementSystem)));
        } else {
          setSmmInput("");
        }

        setBmiInput(data.currentBmi !== null && data.currentBmi !== undefined ? data.currentBmi : "");

        const hCm = data.heightCm ?? 178;
        if (isImp) {
          const totalInches = Math.round(hCm / 2.54);
          setHeightFeet(Math.floor(totalInches / 12));
          setHeightInches(totalInches % 12);
          setHeightCm(totalInches);
        } else {
          setHeightCm(hCm);
        }

        if (data.currentWeightKg != null) {
          setCurrentWeightInput(weightInputValue(data.currentWeightKg, weightUnitFor(data.measurementSystem)));
        } else {
          setCurrentWeightInput("");
        }
        setWeightFromLog(Boolean(data.currentWeightFromLog));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
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
    if (!currentWeightInput || isNaN(val) || val <= 0) return null;
    return toKg(val, weightUnit);
  }, [currentWeightInput, weightUnit]);

  const bodyFatNum = useMemo(() => {
    const val = Number(bodyFatPct);
    return !isNaN(val) && val > 0 ? val : null;
  }, [bodyFatPct]);

  const fatMassKg = useMemo(() => {
    if (weightKgNum === null || bodyFatNum === null) return null;
    return Math.round((weightKgNum * (bodyFatNum / 100)) * 10) / 10;
  }, [weightKgNum, bodyFatNum]);

  const leanMassKg = useMemo(() => {
    if (weightKgNum === null || fatMassKg === null) return null;
    return Math.round((weightKgNum - fatMassKg) * 10) / 10;
  }, [weightKgNum, fatMassKg]);

  // Derived Height in cm
  const resolvedHeightCm = useMemo(() => {
    if (isImperial) {
      const ft = Number(heightFeet) || 0;
      const inch = Number(heightInches) || 0;
      return Math.round((ft * 12 + inch) * 2.54);
    }
    return Number(heightCm) || 178;
  }, [heightCm, heightFeet, heightInches, isImperial]);

  // Transform weight entries into InBody entries list for chart
  const inBodyEntries: BodyFatDataPoint[] = useMemo(() => {
    return (weightData?.inbody ?? [])
      .filter((e) => 
        (typeof e.bodyFatPct === "number" && e.bodyFatPct > 0) ||
        (typeof e.smmKg === "number" && e.smmKg > 0) ||
        (typeof e.bmi === "number" && e.bmi > 0)
      )
      .sort((x, y) => x.date.localeCompare(y.date))
      .map((e) => ({
        id: e.id,
        date: e.date,
        bodyFatPct: e.bodyFatPct,
        smmKg: e.smmKg,
        bmi: e.bmi,
        weightKg: e.weightKg,
        notes: e.notes,
      }));
  }, [weightData]);

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
      const finalWeightKg = currentWeightInput !== "" && !isNaN(Number(currentWeightInput)) && Number(currentWeightInput) > 0
        ? toKg(Number(currentWeightInput), weightUnit)
        : null;

      const parsedSmm = smmInput !== "" ? Number(smmInput) : null;
      const finalSmmKg = parsedSmm !== null && !isNaN(parsedSmm)
        ? toKg(parsedSmm, weightUnit)
        : null;

      const parsedBmi = bmiInput !== "" ? Number(bmiInput) : null;
      const finalBmi = parsedBmi !== null && !isNaN(parsedBmi) ? parsedBmi : null;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sex,
          birthDate: birthDate || null,
          age: computedAgeFromBirthDate,
          heightCm: resolvedHeightCm,
          ...(weightFromLog ? {} : { currentWeightKg: finalWeightKg }),
          currentBodyFatPct: bodyFatPct !== "" ? Number(bodyFatPct) : null,
          currentSmmKg: finalSmmKg,
          currentBmi: finalBmi,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setBodyMsg({ type: "error", text: data.error || "Failed to update body profile" });
      } else {
        setBodyMsg({ type: "success", text: "Body profile and metrics saved!" });
        await fetchSettings();
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
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">Account & Body Profile</p>
          <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            User Profile
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsLogModalOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-5 min-h-[44px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-sm font-semibold rounded-full transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Weigh-In / InBody</span>
        </button>
      </div>

      {/* Account Overview Header Card */}
      <div className="p-6 md:p-8 bg-[var(--surface)] rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-5 pb-6 border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-full bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center text-2xl font-bold uppercase shrink-0">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
                {user?.displayName || "User"}
              </h2>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] capitalize">
                {user?.role || "Member"}
              </span>
            </div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{user?.email}</div>

            {user?.role === "admin" && (
              <div className="mt-3">
                <Link
                  href="/admin"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] hover:text-[var(--accent)] text-xs font-semibold transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Users &amp; accounts management</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Name Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-3 max-w-md">
          {infoMsg && (
            <div
              className={cn(
                "p-3 rounded-2xl text-xs flex items-center space-x-2",
                infoMsg.type === "success"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "bg-[var(--macro-fat-bg)] text-[var(--status-over-target)]"
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

          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Display name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 min-h-[44px] bg-[var(--background)] rounded-2xl text-sm font-medium text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
            </div>
            <button
              type="submit"
              disabled={infoLoading}
              className="inline-flex items-center justify-center space-x-1.5 px-6 min-h-[44px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition disabled:opacity-60 cursor-pointer shrink-0"
            >
              {infoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save name</span>
            </button>
          </div>
        </form>
      </div>

      {/* Body & Health Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Weight */}
        <div className="p-5 rounded-3xl bg-[var(--surface)] space-y-1">
          <span className="text-xs text-[var(--text-muted)] block">Current weight</span>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-tabular">
            {currentWeightInput ? (
              <>
                {currentWeightInput} <span className="text-xs font-normal text-[var(--text-secondary)]">{weightUnit}</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <span className="text-xs text-[var(--text-muted)] block truncate">
            {weightData?.summary.avg7Kg != null ? `7-day average: ${formatWeight(weightData.summary.avg7Kg, weightUnit)} ${weightUnit}` : "Latest weigh-in"}
          </span>
        </div>

        {/* Body Fat % */}
        <div className="p-5 rounded-3xl bg-[var(--surface)] space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--macro-protein)] shrink-0" />
            <span className="text-xs text-[var(--text-muted)] block truncate">Body fat</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-tabular">
            {bodyFatPct ? `${bodyFatPct}%` : "—"}
          </div>
          <span className="text-xs text-[var(--text-muted)] block">
            {inBodyEntries.filter(e => e.bodyFatPct).length > 0 ? `${inBodyEntries.filter(e => e.bodyFatPct).length} scans logged` : "Monthly scan"}
          </span>
        </div>

        {/* SMM (Skeletal Muscle Mass) */}
        <div className="p-5 rounded-3xl bg-[var(--surface)] space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
            <span className="text-xs text-[var(--text-muted)] block truncate">SMM (Muscle)</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-tabular">
            {smmInput !== "" ? (
              <>
                {smmInput} <span className="text-xs font-normal text-[var(--text-secondary)]">{weightUnit}</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <span className="text-xs text-[var(--text-muted)] block">InBody scan</span>
        </div>

        {/* Lean Body Mass */}
        <div className="p-5 rounded-3xl bg-[var(--surface)] space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--macro-protein)] shrink-0" />
            <span className="text-xs text-[var(--text-muted)] block truncate">Lean mass</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-tabular">
            {leanMassKg !== null ? (
              <>
                {weightInputValue(leanMassKg, weightUnit)}{" "}
                <span className="text-xs font-normal text-[var(--text-secondary)]">{weightUnit}</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <span className="text-xs text-[var(--text-muted)] block truncate">Lean tissue</span>
        </div>

        {/* Total Fat Mass */}
        <div className="p-5 rounded-3xl bg-[var(--surface)] space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--macro-fat)] shrink-0" />
            <span className="text-xs text-[var(--text-muted)] block truncate">Fat mass</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-tabular">
            {fatMassKg !== null ? (
              <>
                {weightInputValue(fatMassKg, weightUnit)}{" "}
                <span className="text-xs font-normal text-[var(--text-secondary)]">{weightUnit}</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <span className="text-xs text-[var(--text-muted)] block truncate">Body fat</span>
        </div>
      </div>

      {/* Body & Health Profile Form Card */}
      <div className="p-6 md:p-8 bg-[var(--surface)] rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--background)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Body & Physical Profile</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Birthday automatically tracks age. Height, weight, InBody stats calculate accurate TDEE.
              </p>
            </div>
          </div>

          {/* Units Segmented Control */}
          <div className="flex bg-[var(--background)] p-1 rounded-full self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMeasurementSystem("metric")}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer",
                measurementSystem === "metric"
                  ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Metric (kg, cm)
            </button>
            <button
              type="button"
              onClick={() => setMeasurementSystem("imperial")}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer",
                measurementSystem === "imperial"
                  ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Imperial (lbs, ft)
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveBodyProfile} className="space-y-6">
          {bodyMsg && (
            <div
              className={cn(
                "p-3 rounded-2xl text-xs flex items-center space-x-2",
                bodyMsg.type === "success"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "bg-[var(--macro-fat-bg)] text-[var(--status-over-target)]"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Sex */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Biological sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-4 min-h-[44px] text-sm font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Birthday with Auto-Adjusting Age */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Birthday
                </label>
                <span className="text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-full">
                  {computedAgeFromBirthDate} yrs
                </span>
              </div>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 min-h-[44px] text-sm font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Height ({heightUnit})
              </label>
              {isImperial ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={3}
                    max={7}
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    className="w-1/2 px-4 min-h-[44px] text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
                    placeholder="ft"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">ft</span>
                  <input
                    type="number"
                    min={0}
                    max={11}
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    className="w-1/2 px-4 min-h-[44px] text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
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
                  className="w-full px-4 min-h-[44px] text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
                />
              )}
            </div>

            {/* Current Weight */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Current weight ({weightUnit})
              </label>
              <input
                type="number"
                step="0.1"
                min={30}
                max={400}
                value={currentWeightInput}
                onChange={(e) => setCurrentWeightInput(e.target.value)}
                readOnly={weightFromLog}
                placeholder={weightFromLog ? undefined : "No weight logged"}
                aria-describedby={weightFromLog ? "profile-weight-hint" : undefined}
                className="w-full px-4 min-h-[44px] text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] read-only:opacity-70"
              />
              {weightFromLog ? (
                <p id="profile-weight-hint" className="mt-1 text-xs text-[var(--text-muted)]">
                  From your latest weigh-in.
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  No weigh-in logged yet. Log your weight on the Weight page.
                </p>
              )}
            </div>

            {/* Body Fat % (InBody scan) */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                InBody body fat %
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
                  className="w-full px-4 min-h-[44px] text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium">
                  %
                </span>
              </div>
            </div>

            {/* SMM (Skeletal Muscle Mass) */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                InBody SMM ({weightUnit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min={5}
                  max={200}
                  placeholder={isImperial ? "e.g. 76.5" : "e.g. 34.8"}
                  value={smmInput}
                  onChange={(e) => setSmmInput(e.target.value)}
                  className="w-full px-4 min-h-[44px] text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium">
                  {weightUnit}
                </span>
              </div>
            </div>

            {/* BMI (Body Mass Index) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  InBody BMI
                </label>
              </div>
              <input
                type="number"
                step="0.1"
                min={10}
                max={60}
                placeholder="e.g. 23.8"
                value={bmiInput}
                onChange={(e) => setBmiInput(e.target.value)}
                className="w-full px-4 min-h-[44px] text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-[var(--border)]">
            <Link
              href="/settings"
              className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1.5"
            >
              <span>Adjust nutrition targets & TDEE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="submit"
              disabled={bodyLoading}
              className="inline-flex items-center space-x-2 px-6 min-h-[44px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition disabled:opacity-60 cursor-pointer"
            >
              {bodyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save body profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* Visual Trends Section */}
      <div className="space-y-6">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">Analytics & Progress</p>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Composition & Progress Charts
          </h2>
        </div>

        {/* 1. Body Fat % InBody Trend Chart */}
        <BodyFatTrendChart entries={inBodyEntries} measurementSystem={measurementSystem} />

        {/* 2. Scale Weight Trend Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Weight Trend & 7-Day Average
            </h3>
            <Link
              href="/weight"
              className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>Open full weight log</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card overflow-hidden">
            <WeightChart
              entries={weightData?.entries ?? []}
              from={rangeFrom(weightRange)}
              goalKg={goalWeightKg}
              unit={weightUnit}
              range={weightRange}
              onRangeChange={setWeightRange}
            />
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="p-6 md:p-8 bg-[var(--surface)] rounded-3xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--background)] flex items-center justify-center text-[var(--accent)] shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Change Password</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Updating your password will automatically invalidate other active sessions.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md pt-2">
          {pwdMsg && (
            <div
              className={cn(
                "p-3 rounded-2xl text-xs flex items-center space-x-2",
                pwdMsg.type === "success"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "bg-[var(--macro-fat-bg)] text-[var(--status-over-target)]"
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
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Current password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 min-h-[44px] bg-[var(--background)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              New password (min. 8 characters)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 min-h-[44px] bg-[var(--background)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Confirm new password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 min-h-[44px] bg-[var(--background)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
            />
          </div>

          <button
            type="submit"
            disabled={pwdLoading}
            className="inline-flex items-center space-x-2 px-6 min-h-[44px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-full transition disabled:opacity-60 cursor-pointer"
          >
            {pwdLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Update password</span>
          </button>
        </form>
      </div>

      {/* Delete Account Section */}
      <div className="p-6 md:p-8 bg-[var(--surface)] rounded-3xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--macro-fat-bg)] flex items-center justify-center text-[var(--status-over-target)] shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--status-over-target)]">Delete Account</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Permanently delete your account and all associated recipes, meal plans, pantry items, and logs. This action is irreversible.
            </p>
          </div>
        </div>

        {showDeleteConfirm ? (
          <form onSubmit={handleDeleteAccount} className="space-y-4 max-w-md pt-2">
            {deleteMsg && (
              <div className="p-3 rounded-2xl bg-[var(--macro-fat-bg)] text-[var(--status-over-target)] text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--status-over-target)] mb-1.5">
                Confirm your password to delete your account:
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 min-h-[44px] bg-[var(--background)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--status-over-target)] transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={deleteLoading}
                className="inline-flex items-center space-x-2 px-6 min-h-[44px] bg-[var(--status-over-target)] text-white text-xs font-semibold rounded-full transition disabled:opacity-60 cursor-pointer"
              >
                {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Permanently delete my account</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 min-h-[44px] bg-[var(--background)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center px-6 min-h-[44px] border border-[var(--status-over-target)] text-[var(--status-over-target)] hover:bg-[var(--macro-fat-bg)] text-xs font-semibold rounded-full transition cursor-pointer"
            >
              Delete account...
            </button>
          </div>
        )}
      </div>

      {/* Log Weight Modal with Body Fat, SMM, and BMI input */}
      <LogWeightModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={() => {
          invalidateAll();
          fetchSettings();
        }}
        measurementSystem={measurementSystem}
      />
    </div>
  );
}
