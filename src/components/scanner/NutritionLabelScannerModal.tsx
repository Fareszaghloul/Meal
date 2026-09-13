"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  Loader2,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  AlertCircle,
  Check,
} from "lucide-react";
import { NutritionScanReview } from "./NutritionScanReview";
import { ParsedNutritionLabel } from "@/lib/nutrition/label-parser";
import { cn } from "@/lib/utils";

interface NutritionLabelScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSaved?: (savedFood: any) => void;
}

export function NutritionLabelScannerModal({
  isOpen,
  onClose,
  onFoodSaved,
}: NutritionLabelScannerModalProps) {
  const [step, setStep] = useState<"capture" | "processing" | "review" | "error">("capture");
  const [inputMode, setInputMode] = useState<"camera" | "upload">("camera");

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scan & Processing State
  const [parsedResult, setParsedResult] = useState<ParsedNutritionLabel | null>(null);
  const [scanError, setScanError] = useState<{ title: string; guidance?: string[] } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setInputMode("upload");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities && (videoTrack.getCapabilities() as any)) || {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }
    } catch (err: any) {
      console.warn("Camera init failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. You can upload an image from your device instead.");
      } else {
        setCameraError("Camera is currently unavailable. You can upload an image instead.");
      }
      setHasCamera(false);
      setInputMode("upload");
    }
  }, [facingMode, stopCamera]);

  // Handle Torch toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const nextState = !isTorchOn;
        await (videoTrack as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn("Torch toggle failed:", err);
      }
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("capture");
      setScanError(null);
      setParsedResult(null);
      if (inputMode === "camera") {
        startCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, inputMode, startCamera, stopCamera]);

  // Keyboard accessibility: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && step !== "processing") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, onClose]);

  // Send Image to OCR API
  const processImagePayload = async (imageInput: Blob | string) => {
    setStep("processing");
    setScanError(null);
    stopCamera();

    try {
      let res: Response;
      if (imageInput instanceof Blob) {
        const formData = new FormData();
        formData.append("image", imageInput, "label.jpg");
        res = await fetch("/api/nutrition/scan", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/nutrition/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageInput }),
        });
      }

      const result = await res.json();

      if (!res.ok || !result.success) {
        const guidance = result.guidance || [
          "Move closer to the label",
          "Use better lighting",
          "Keep the packaging as flat as possible",
          "Make sure all nutrition values are visible",
        ];
        setScanError({
          title: result.error || "We couldn't clearly read the label.",
          guidance,
        });
        setStep("error");
        return;
      }

      setParsedResult(result.data);
      setStep("review");
    } catch (err: any) {
      setScanError({
        title: "Scan request failed. Please check your connection and try again.",
        guidance: [
          "Ensure your image is under 10MB",
          "Try taking a photo with more direct lighting",
        ],
      });
      setStep("error");
    }
  };

  // Capture photo from live video stream
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    processImagePayload(dataUrl);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImagePayload(file);
    }
  };

  // Handle Drag and Drop for Desktop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processImagePayload(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in"
      onClick={() => step !== "processing" && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-5 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div>
            <h3 id="scanner-modal-title" className="font-semibold text-base text-[var(--text-primary)]">
              {step === "review" ? "Review Nutrition" : "Scan Nutrition Label"}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {step === "review"
                ? "Verify extracted values before saving"
                : "Point your camera or upload a package photo"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step: Capture */}
        {step === "capture" && (
          <div className="space-y-4">
            {/* Input Mode Selector */}
            <div className="flex rounded-xl bg-[var(--background)] p-1 border border-[var(--border)] text-xs">
              <button
                type="button"
                onClick={() => {
                  setInputMode("camera");
                  startCamera();
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center space-x-1.5",
                  inputMode === "camera"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Use Camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setInputMode("upload");
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center space-x-1.5",
                  inputMode === "upload"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image</span>
              </button>
            </div>

            {/* Camera View */}
            {inputMode === "camera" && (
              <div className="space-y-3">
                <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* Minimal Scanning Alignment Box */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-4/5 h-3/4 rounded-xl border-2 border-white/70 shadow-xs relative">
                      {/* Viewfinder corner guides */}
                      <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                    </div>
                    <span className="text-[11px] text-white/90 bg-black/50 px-2.5 py-0.5 rounded-full mt-2 font-medium tracking-wide">
                      Align label here
                    </span>
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5 z-10">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        aria-label={isTorchOn ? "Turn flashlight off" : "Turn flashlight on"}
                        className={cn(
                          "p-2 rounded-full backdrop-blur-md transition cursor-pointer",
                          isTorchOn ? "bg-amber-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
                        )}
                      >
                        {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={flipCamera}
                      aria-label="Switch camera"
                      className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-center text-xs text-[var(--text-secondary)]">
                  Position the nutrition label flat inside the frame.
                </p>

                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Label</span>
                  </button>
                </div>
              </div>
            )}

            {/* Upload View (Desktop & Fallback) */}
            {inputMode === "upload" && (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full aspect-4/3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition",
                    isDragOver
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border)] hover:border-[var(--text-secondary)] bg-[var(--background)]"
                  )}
                >
                  <Upload className="w-8 h-8 text-[var(--text-secondary)] mb-2" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Drop label photo here
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    or click to choose image (JPEG, PNG, WebP)
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {cameraError && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                    {cameraError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Processing State */}
        {step === "processing" && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-7 h-7 text-[var(--accent)] animate-spin" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Analyzing nutrition label...
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Extracting calories, macronutrients, and serving information
              </p>
            </div>
          </div>
        )}

        {/* Step: Error & Actionable Guidance */}
        {step === "error" && scanError && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--text-primary)] space-y-2">
              <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scanError.title}</span>
              </div>

              {scanError.guidance && scanError.guidance.length > 0 && (
                <div className="space-y-1 pt-1 text-[11px] text-[var(--text-secondary)]">
                  <p className="font-medium text-[var(--text-primary)]">Suggestions for a better scan:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {scanError.guidance.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("capture");
                  if (inputMode === "camera") startCamera();
                }}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Step: Review Extracted Data */}
        {step === "review" && parsedResult && (
          <NutritionScanReview
            parsedData={parsedResult}
            onSaveSuccess={(savedFood) => {
              if (onFoodSaved) onFoodSaved(savedFood);
              onClose();
            }}
            onRetake={() => {
              setStep("capture");
              if (inputMode === "camera") startCamera();
            }}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}
