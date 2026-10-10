"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  Keyboard,
  X,
  Loader2,
  Check,
  AlertCircle,
  Package,
  Calendar,
  Plus,
  RefreshCw,
  ExternalLink,
  Flashlight,
  FlashlightOff,
  Layers,
} from "lucide-react";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { cn } from "@/lib/utils";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "meal" | "pantry" | "food" | "general";
  defaultDayOfWeek?: string;
  defaultMealCategory?: string;
  onProductSelected?: (product: any) => void;
  onSuccess?: () => void;
  onOpenNutritionScanner?: () => void;
  onOpenManualEntry?: (barcode?: string) => void;
  onOpenSearchByName?: (initialQuery?: string) => void;
}

// Lightweight synthesized beep with haptic vibration feedback
function playScanBeep() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
  } catch {
    // Ignore vibration restrictions
  }

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  mode = "general",
  defaultDayOfWeek = "monday",
  defaultMealCategory = "lunch",
  onProductSelected,
  onSuccess,
  onOpenNutritionScanner,
  onOpenManualEntry,
  onOpenSearchByName,
}: BarcodeScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "manual">("camera");
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string>("");

  // Action states for saving
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [sessionScannedCount, setSessionScannedCount] = useState(0);

  // Meal customization
  const [selectedDay, setSelectedDay] = useState(defaultDayOfWeek);
  const [selectedCategory, setSelectedCategory] = useState(defaultMealCategory);
  const [portionGrams, setPortionGrams] = useState("100");

  // Pantry customization
  const [pantryQty, setPantryQty] = useState("1");
  const [pantryUnit, setPantryUnit] = useState("package");

  const scannerContainerId = "barcode-scanner-viewfinder";
  const scannerInstanceRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Initialize camera scanner with native BarcodeDetector and high-resolution decoding
  const startScanner = async () => {
    setCameraError(null);
    setIsTorchOn(false);
    setHasTorch(false);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

      if (scannerInstanceRef.current && isScanningRef.current) {
        try {
          await scannerInstanceRef.current.stop();
          scannerInstanceRef.current.clear();
        } catch {
          // ignore
        }
        isScanningRef.current = false;
      }

      const formats = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      // Enable native hardware BarcodeDetector (Apple Vision / Google ML Kit)
      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: formats,
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerInstanceRef.current = html5QrCode;

      // Full-resolution viewfinder scanning without restrictive 260x160 cropping
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 25,
          disableFlip: true,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            advanced: [{ focusMode: "continuous" } as any],
          },
        },
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // Frame scan progress, normal
        }
      );

      isScanningRef.current = true;

      // Detect torch / flashlight capability
      try {
        const capabilities = html5QrCode.getRunningTrackCameraCapabilities?.();
        if (capabilities?.torchFeature?.()?.isSupported?.()) {
          setHasTorch(true);
        } else {
          const trackCapabilities = (html5QrCode.getRunningTrackCapabilities?.() as any);
          if (trackCapabilities?.torch) {
            setHasTorch(true);
          }
        }
      } catch {
        // Torch capability check not supported
      }
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setCameraError(
        err?.message ||
          "Camera access was denied or is unavailable on this device. You can still upload a photo or enter the barcode digits manually."
      );
      isScanningRef.current = false;
    }
  };

  const toggleTorch = async () => {
    if (!scannerInstanceRef.current || !isScanningRef.current) return;
    const nextState = !isTorchOn;
    try {
      const capabilities = scannerInstanceRef.current.getRunningTrackCameraCapabilities?.();
      if (capabilities?.torchFeature?.()?.isSupported?.()) {
        await capabilities.torchFeature().apply(nextState);
        setIsTorchOn(nextState);
        return;
      }
      await scannerInstanceRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn("Torch toggle error:", err);
    }
  };

  const stopScanner = async () => {
    setIsTorchOn(false);
    setHasTorch(false);
    if (scannerInstanceRef.current && isScanningRef.current) {
      try {
        await scannerInstanceRef.current.stop();
        scannerInstanceRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop error:", err);
      }
      isScanningRef.current = false;
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "camera" && !scannedProduct) {
      // Short timeout to ensure DOM container is rendered
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, scannedProduct]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleBarcodeDetected = async (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    playScanBeep();
    await stopScanner();
    setScannedBarcode(clean);
    lookupBarcode(clean);
  };

  const lookupBarcode = async (barcode: string) => {
    setIsLookingUp(true);
    setLookupError(null);
    setProductNotFound(false);
    setScannedProduct(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/foods/barcode/${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.food) {
          setScannedProduct(data.food);
          setProductNotFound(false);
          const servWeight = data.food.servingWeightGrams || data.food.servingSize || 100;
          setPortionGrams(String(servWeight));
          if (onProductSelected) {
            onProductSelected(data.food);
          }
        } else {
          setProductNotFound(true);
        }
      } else {
        setProductNotFound(true);
      }
    } catch (err: any) {
      setLookupError("Network error while communicating with barcode lookup service.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLookingUp(true);
    setLookupError(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const formats = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];
      const html5QrCode = new Html5Qrcode("upload-temp-scanner", {
        formatsToSupport: formats,
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleBarcodeDetected(decodedText);
    } catch (err: any) {
      setLookupError("Could not detect a clear barcode in the uploaded image. Please try another photo or enter digits.");
      setIsLookingUp(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    setScannedBarcode(manualBarcode.trim());
    lookupBarcode(manualBarcode.trim());
  };

  const resetToScanAgain = () => {
    setScannedProduct(null);
    setScannedBarcode("");
    setLookupError(null);
    setProductNotFound(false);
    setActionSuccess(null);
    if (activeTab === "camera") {
      setTimeout(() => {
        startScanner();
      }, 100);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
    resetToScanAgain();
  };

  // 1. Log to Meal Plan Action
  const handleLogToMealPlan = async () => {
    if (!scannedProduct) return;
    setIsSubmitting(true);
    try {
      const factor = (Number(portionGrams) || 100) / 100;
      const calories = Math.round(scannedProduct.caloriesPer100g * factor);
      const protein = Math.round(scannedProduct.proteinPer100g * factor * 10) / 10;
      const carbs = Math.round(scannedProduct.carbsPer100g * factor * 10) / 10;
      const fat = Math.round(scannedProduct.fatPer100g * factor * 10) / 10;

      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: selectedDay,
          mealCategory: selectedCategory,
          customName: `${scannedProduct.name} (${portionGrams}g)`,
          servings: 1,
          calories,
          protein,
          carbs,
          fat,
        }),
      });

      if (!res.ok) throw new Error("Failed to add meal");
      if (onSuccess) onSuccess();

      if (isContinuousMode) {
        setSessionScannedCount((c) => c + 1);
        setActionSuccess(`Logged! Ready for next barcode...`);
        setTimeout(() => {
          resetToScanAgain();
        }, 1200);
      } else {
        setActionSuccess(`Logged to ${selectedDay.toUpperCase()} ${selectedCategory.toUpperCase()}!`);
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } catch (err: any) {
      setLookupError(err?.message || "Failed to log meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Add to Pantry Action
  const handleAddToPantry = async () => {
    if (!scannedProduct) return;
    setIsSubmitting(true);
    try {
      // First ensure imported into Food DB
      const importRes = await fetch("/api/foods/external/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scannedProduct),
      });

      let foodId: string | null = null;
      if (importRes.ok) {
        const importedFood = await importRes.json();
        foodId = importedFood.id;
      }

      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scannedProduct.name,
          quantity: Number(pantryQty) || 1,
          unit: pantryUnit || "package",
          category: scannedProduct.category || "Pantry",
          foodId,
        }),
      });

      if (!res.ok) throw new Error("Failed to add pantry item");
      if (onSuccess) onSuccess();

      if (isContinuousMode) {
        setSessionScannedCount((c) => c + 1);
        setActionSuccess(`Added to Pantry! Ready for next barcode...`);
        setTimeout(() => {
          resetToScanAgain();
        }, 1200);
      } else {
        setActionSuccess("Added to your Pantry inventory!");
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } catch (err: any) {
      setLookupError(err?.message || "Failed to add to pantry");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Save to Food Database Action
  const handleSaveToFoodDB = async () => {
    if (!scannedProduct) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/foods/external/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scannedProduct),
      });

      if (!res.ok) throw new Error("Failed to import food");
      setActionSuccess("Saved to your local Food Database!");
      if (onSuccess) onSuccess();
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      setLookupError(err?.message || "Failed to save food");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div 
        className="modal-panel relative w-full max-w-lg rounded-3xl bg-[var(--surface)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Barcode Scanner</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Scan UPC / EAN on any food package for instant nutrition
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsContinuousMode((v) => !v)}
              className={cn(
                "tap-target px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 border touch-manipulation",
                isContinuousMode
                  ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold rounded-full"
                  : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full"
              )}
              title="Continuous grocery scanning mode: scans multiple items without closing the modal"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Continuous</span>
              {sessionScannedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-bold">
                  {sessionScannedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
               aria-label="Close" className="tap-target inline-flex items-center justify-center p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Navigation Tabs (Camera / Photo Upload / Manual Digits) */}
        {!scannedProduct && (
          <div className="flex border-b border-[var(--border)] bg-[var(--background)]/50 px-4 sm:px-6 pt-2 gap-2 text-xs font-medium overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("camera")}
              className={`pb-2.5 px-2 border-b-2 flex items-center gap-1.5 transition shrink-0 whitespace-nowrap touch-manipulation ${
                activeTab === "camera"
                  ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Camera</span>
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`pb-2.5 px-2 border-b-2 flex items-center gap-1.5 transition shrink-0 whitespace-nowrap touch-manipulation ${
                activeTab === "upload"
                  ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Photo Upload</span>
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`pb-2.5 px-2 border-b-2 flex items-center gap-1.5 transition shrink-0 whitespace-nowrap touch-manipulation ${
                activeTab === "manual"
                  ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Manual Digits</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Loading lookup overlay */}
          {isLookingUp && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
              <div className="text-sm font-medium text-[var(--text-primary)]">
                Searching MealPrep, Open Food Facts, and USDA for barcode...
              </div>
              <div className="text-xs font-tabular text-[var(--text-secondary)]">
                Barcode: {scannedBarcode}
              </div>
            </div>
          )}

          {/* Product Not Found State (Calm, friendly guidance — not an error) */}
          {productNotFound && !isLookingUp && (
            <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-3 animate-in fade-in">
              <div className="w-10 h-10 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
                <Package className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Product Not Found</h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  We couldn&apos;t find a product matching barcode <span className="font-mono text-[var(--text-primary)]">{scannedBarcode}</span> in our databases.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                {onOpenNutritionScanner && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenNutritionScanner();
                    }}
                    className="w-full sm:w-auto px-5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Nutrition Label</span>
                  </button>
                )}

                {onOpenManualEntry && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenManualEntry(scannedBarcode);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)] text-xs font-medium text-[var(--text-primary)] transition cursor-pointer"
                  >
                    <span>Enter Manually</span>
                  </button>
                )}

                {onOpenSearchByName && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenSearchByName();
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)] text-xs font-medium text-[var(--text-primary)] transition cursor-pointer"
                  >
                    <span>Search by Name</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetToScanAgain}
                  className="w-full sm:w-auto px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                >
                  Scan another
                </button>
              </div>
            </div>
          )}

          {/* Error Message (Actual Network / System errors) */}
          {lookupError && !isLookingUp && !productNotFound && (
            <div className="p-4 rounded-xl bg-[var(--ui-error-bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[var(--ui-error)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-[var(--ui-error)] mb-0.5">Lookup Notice</div>
                <div>{lookupError}</div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={resetToScanAgain}
                    className="tap-target px-3 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--background)] transition"
                  >
                    Scan another
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-xs text-[var(--accent)] flex items-center gap-2">
              <Check className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
          )}

          {/* SCANNED PRODUCT RESULT CARD */}
          {scannedProduct && !isLookingUp && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">
                      {scannedProduct.brand || "Packaged Product"}
                    </span>
                    <span className="text-[10px] font-tabular text-[var(--text-secondary)] bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                      UPC: {scannedBarcode || scannedProduct.barcode || "N/A"}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {scannedProduct.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Category: {scannedProduct.category}
                  </p>
                </div>
                <button
                  onClick={resetToScanAgain}
                  className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs flex items-center gap-1 shrink-0"
                  title="Scan another barcode"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rescan</span>
                </button>
              </div>

              {/* Nutrition Badges per 100g */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Nutrition per 100g
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <MacroBadge label="Cal" value={scannedProduct.caloriesPer100g} type="calories" />
                  <MacroBadge label="Pro" value={scannedProduct.proteinPer100g} unit="g" type="protein" />
                  <MacroBadge label="Carb" value={scannedProduct.carbsPer100g} unit="g" type="carbs" />
                  <MacroBadge label="Fat" value={scannedProduct.fatPer100g} unit="g" type="fat" />
                </div>
              </div>

              {/* Log as Meal Section */}
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
                <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[var(--macro-protein)]" />
                  <span>Log Directly to Meal Plan</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Portion (grams)
                    </label>
                    <input
                      type="number"
                      value={portionGrams}
                      onChange={(e) => setPortionGrams(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Day
                    </label>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] capitalize"
                    >
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
                        (d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] capitalize"
                    >
                      {["breakfast", "lunch", "dinner", "snack"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between pt-1">
                  <span>
                    Total:{" "}
                    <strong className="font-tabular text-[var(--text-primary)]">
                      {Math.round(
                        (scannedProduct.caloriesPer100g * (Number(portionGrams) || 100)) / 100
                      )}{" "}
                      kcal
                    </strong>
                  </span>
                  <span>
                    Pro:{" "}
                    <strong className="font-tabular text-[var(--macro-protein)]">
                      {Math.round(
                        ((scannedProduct.proteinPer100g * (Number(portionGrams) || 100)) / 100) * 10
                      ) / 10}
                      g
                    </strong>{" "}
                    • Carb:{" "}
                    <strong className="font-tabular text-[var(--macro-carbs)]">
                      {Math.round(
                        ((scannedProduct.carbsPer100g * (Number(portionGrams) || 100)) / 100) * 10
                      ) / 10}
                      g
                    </strong>{" "}
                    • Fat:{" "}
                    <strong className="font-tabular text-[var(--macro-fat)]">
                      {Math.round(
                        ((scannedProduct.fatPer100g * (Number(portionGrams) || 100)) / 100) * 10
                      ) / 10}
                      g
                    </strong>
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleLogToMealPlan}
                    disabled={isSubmitting}
                    className="flex-1 min-h-[44px] px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                    <span>Log to Meal Plan</span>
                  </button>
                  <button
                    onClick={handleAddToPantry}
                    disabled={isSubmitting}
                    className="py-2 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)] text-[var(--text-primary)] text-xs font-medium shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Add to Pantry</span>
                  </button>
                  <button
                    onClick={handleSaveToFoodDB}
                    disabled={isSubmitting}
                    className="py-2 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)] text-[var(--text-primary)] text-xs font-medium shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save to DB</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: LIVE CAMERA VIEWFINDER */}
          {!scannedProduct && !isLookingUp && activeTab === "camera" && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black/90 aspect-4/3 flex items-center justify-center border border-[var(--border)] shadow-inner">
                {/* HTML5 QR code renders inside this div */}
                <div id={scannerContainerId} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

                {/* Flashlight / Torch Toggle Button */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`absolute top-3 right-3 z-20 p-2.5 rounded-full backdrop-blur-md transition shadow-md touch-manipulation flex items-center justify-center ${
                      isTorchOn
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                        : "bg-black/60 text-white hover:bg-black/80 border border-white/20"
                    }`}
                    title={isTorchOn ? "Turn off flashlight" : "Turn on flashlight"}
                  >
                    {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                  </button>
                )}

                {/* Laser scan animation line */}
                <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />

                {/* Reticle brackets */}
                <div className="pointer-events-none absolute inset-x-8 sm:inset-x-12 inset-y-8 sm:inset-y-12 border border-white/30 rounded-lg flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <span className="w-3 h-3 border-t-2 border-l-2 border-[var(--accent)] -mt-2 -ml-2" />
                    <span className="w-3 h-3 border-t-2 border-r-2 border-[var(--accent)] -mt-2 -mr-2" />
                  </div>
                  <div className="flex justify-between">
                    <span className="w-3 h-3 border-b-2 border-l-2 border-[var(--accent)] -mb-2 -ml-2" />
                    <span className="w-3 h-3 border-b-2 border-r-2 border-[var(--accent)] -mb-2 -mr-2" />
                  </div>
                </div>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-[var(--ui-error-bg)] border border-[var(--border)] text-xs text-[var(--ui-error)] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              <p className="text-[11px] text-center text-[var(--text-secondary)]">
                Point camera at barcode. Fast native detection will capture it automatically.
              </p>
            </div>
          )}

          {/* TAB 2: PHOTO UPLOAD FALLBACK */}
          {!scannedProduct && !isLookingUp && activeTab === "upload" && (
            <div className="space-y-4 py-4 text-center">
              {/* Hidden scratch scanner div for file scanning */}
              <div id="upload-temp-scanner" className="hidden" />

              <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 hover:border-[var(--accent)] transition flex flex-col items-center justify-center space-y-3 cursor-pointer relative bg-[var(--background)]/30">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    Upload barcode image or photo
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Take a photo with your device or upload from gallery
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL BARCODE ENTRY */}
          {!scannedProduct && !isLookingUp && activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Barcode Number (UPC / EAN)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    pattern="[0-9]{8,14}"
                    placeholder="e.g. 0737628064502 or 041196910759"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    className="px-5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition"
                  >
                    Lookup
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                  Type the 8, 12, or 13 digits printed beneath the barcode lines.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
