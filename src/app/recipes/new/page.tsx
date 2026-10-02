"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Link as LinkIcon,
  Sparkles,
  Camera,
  PenTool,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Upload,
  Info,
  ArrowRight,
} from "lucide-react";
import { RecipeReviewForm } from "@/components/recipes/RecipeReviewForm";
import { ParsedRecipe } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export default function AddRecipePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Input states
  const [urlInput, setUrlInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Active form section accordion/expand if desired, or all 3 stacked ready to use!
  const [activeTab, setActiveTab] = useState<"link" | "paste" | "screenshot">("link");

  // Review state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [sourcePlatform, setSourcePlatform] = useState("Manual");
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Health check state for Ollama
  const [ollamaStatus, setOllamaStatus] = useState<{
    isRunning: boolean;
    models: string[];
    baseUrl?: string;
    configuredModel?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/ai/health")
      .then((res) => res.json())
      .then((data) => setOllamaStatus(data))
      .catch(() => setOllamaStatus({ isRunning: false, models: [] }));
  }, []);

  const handleParse = async (type: "text" | "url" | "image", content: string) => {
    setIsProcessing(true);
    setErrorMsg("");

    if (type === "url") {
      setProcessingStatus("Fetching page & extracting recipe content...");
    } else if (type === "image") {
      setProcessingStatus("Scanning image & recognizing text (OCR)...");
    } else {
      setProcessingStatus("Formatting recipe with AI parser...");
    }

    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse recipe");
      }

      setParsedRecipe(data.recipe);
      setSourcePlatform(data.sourcePlatform || "Manual");
      setSourceUrl(data.sourceUrl);
      setWarnings(data.warnings || []);
      setIsReviewMode(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error processing recipe"
      );
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
      handleParse("image", result);
    };
    reader.readAsDataURL(file);
  };

  const startManual = () => {
    setParsedRecipe({
      name: "",
      description: "",
      servings: 4,
      tags: ["meal-prep"],
      ingredients: [
        { rawName: "", quantity: 100, unit: "g", uncertainQuantity: false },
      ],
      instructions: [""],
    });
    setSourcePlatform("Manual");
    setWarnings([]);
    setIsReviewMode(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/recipes"
            className="p-2 rounded-full hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            aria-label="Back to recipes"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-sm text-[var(--text-muted)] font-normal">
              Recipe importer
            </p>
            <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
              {isReviewMode ? "Review Recipe" : "Add Recipe"}
            </h1>
          </div>
        </div>

        {!isReviewMode && (
          <button
            type="button"
            onClick={startManual}
            className="px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface)]/80 text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
          >
            <PenTool className="w-4 h-4" />
            <span>Create manually</span>
          </button>
        )}
      </div>

      {/* ─── Ollama Offline Banner in carbs-bg with link to AI settings ─── */}
      {ollamaStatus && !ollamaStatus.isRunning && !isReviewMode && (
        <div className="p-4 rounded-3xl bg-[var(--macro-carbs-bg)] text-[var(--text-primary)] flex items-start space-x-3.5 shadow-none">
          <div className="w-8 h-8 rounded-xl bg-[var(--macro-carbs)]/20 text-[var(--macro-carbs)] flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1 flex-1">
            <div className="font-semibold text-[var(--text-primary)]">
              Local Ollama AI is currently offline
            </div>
            <div className="text-[var(--text-secondary)] leading-relaxed">
              Recipe parsing will use structured heuristics and rule-based extraction. For enhanced local AI extraction (e.g. Qwen2.5), ensure Ollama is running.
            </div>
            <div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 font-semibold text-[var(--macro-carbs)] hover:underline mt-1"
              >
                <span>Configure AI settings</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-[var(--ui-error-bg)] text-[var(--ui-error)] text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── Review Mode ─── */}
      {isReviewMode && parsedRecipe ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsReviewMode(false)}
              className="px-4 py-2 min-h-[44px] rounded-full bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition"
            >
              ← Import another recipe
            </button>
          </div>

          <RecipeReviewForm
            initialData={parsedRecipe}
            sourcePlatform={sourcePlatform}
            sourceUrl={sourceUrl}
            warnings={warnings}
            onSaved={(newId) => {
              window.location.href = `/recipes/${newId}`;
            }}
          />
        </div>
      ) : (
        /* ─── Three Stacked Method Cards: From a link, Paste text, From a screenshot ─── */
        <div className="space-y-4">
          {/* Card 1: From a link */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] text-[var(--lime)] flex items-center justify-center shrink-0">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  From a link
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Import recipe from Instagram, TikTok, blogs, or YouTube videos
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (urlInput.trim()) handleParse("url", urlInput.trim());
              }}
              className="flex flex-col sm:flex-row gap-2.5 pt-1"
            >
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.instagram.com/p/... or recipe URL"
                className="input-field flex-1"
                disabled={isProcessing}
                required
              />
              <button
                type="submit"
                disabled={isProcessing || !urlInput.trim()}
                className="px-6 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
              >
                {isProcessing && activeTab === "link" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{processingStatus || "Extracting..."}</span>
                  </>
                ) : (
                  <span>Extract recipe</span>
                )}
              </button>
            </form>
          </div>

          {/* Card 2: Paste text */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--macro-protein-bg)] text-[var(--macro-protein)] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Paste text
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Copy recipe text, notes or post captions and paste directly
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="High Protein Chipotle Chicken Bowl&#10;&#10;500g chicken breast&#10;200g brown rice&#10;1 can black beans&#10;1 avocado&#10;&#10;Season chicken with cumin and chili powder. Grill for 6-8 mins each side..."
                className="input-field font-mono text-xs p-4 resize-y"
                disabled={isProcessing}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isProcessing || !pasteText.trim()}
                  onClick={() => {
                    setActiveTab("paste");
                    handleParse("text", pasteText);
                  }}
                  className="px-6 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                >
                  {isProcessing && activeTab === "paste" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{processingStatus || "Parsing..."}</span>
                    </>
                  ) : (
                    <span>Parse text</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: From a screenshot as a dashed dropzone */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--macro-fat-bg)] text-[var(--macro-fat)] flex items-center justify-center shrink-0">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  From a screenshot
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Upload a photo or screenshot of a recipe from Instagram, Pinterest, or cookbook
                </p>
              </div>
            </div>

            {/* Dashed dropzone */}
            <label
              htmlFor="recipe-image-upload"
              className={cn(
                "border-2 border-dashed border-[var(--border)] hover:border-[var(--lime)] rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 transition cursor-pointer bg-[var(--background)]/40 hover:bg-[var(--background)]",
                isProcessing && "pointer-events-none opacity-50"
              )}
            >
              <input
                id="recipe-image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setActiveTab("screenshot");
                  handleImageUpload(e);
                }}
                className="hidden"
                disabled={isProcessing}
              />
              <div className="w-12 h-12 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] flex items-center justify-center mb-1">
                <Upload className="w-5 h-5 text-[var(--lime)]" />
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Click or drop recipe screenshot here
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Supports PNG, JPG, WEBP (OCR text extraction)
              </span>

              {isProcessing && activeTab === "screenshot" && (
                <div className="flex items-center space-x-2 text-xs text-[var(--lime)] mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{processingStatus || "Scanning image..."}</span>
                </div>
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
