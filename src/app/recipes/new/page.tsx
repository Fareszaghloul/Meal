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
  CheckCircle2,
  Info,
} from "lucide-react";
import { RecipeReviewForm } from "@/components/recipes/RecipeReviewForm";
import { ParsedRecipe } from "@/lib/ai/types";

type Mode = "select" | "paste" | "url" | "screenshot" | "manual" | "review";

export default function AddRecipePage() {
  const [mode, setMode] = useState<Mode>("select");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Input states
  const [pasteText, setPasteText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Review state
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
      setProcessingStatus("Formatting recipe with local AI model...");
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
      setMode("review");
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
      setSelectedImage(reader.result as string);
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
    setMode("review");
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (mode === "review") setMode("select");
              else if (mode !== "select") setMode("select");
              else window.history.back();
            }}
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              {mode === "review" ? "Review Recipe" : "Add Recipe"}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {mode === "review"
                ? "Verify and edit recipe details before saving"
                : "Choose how you would like to import your recipe"}
            </p>
          </div>
        </div>
      </div>

      {/* Ollama Status Pill if not running */}
      {ollamaStatus && !ollamaStatus.isRunning && mode !== "review" && (
        <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--macro-carbs)] flex items-start space-x-3 text-xs text-[var(--text-primary)]">
          <Info className="w-4 h-4 text-[var(--macro-carbs)] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[var(--macro-carbs)]">Local Ollama is currently offline: </span>
            <span className="text-[var(--text-secondary)]">
              The app will use rule-based parsing or manual entry. To enable local AI models (e.g. Qwen2.5 7B), open a terminal and run{" "}
              <code className="bg-[var(--surface)] border border-[var(--border)] px-1 py-0.5 rounded font-mono text-[var(--text-primary)]">
                ollama serve
              </code>
              .
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--ui-error-bg)] border border-[var(--ui-error-border)] text-[var(--ui-error)] text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mode: Selection Hub */}
      {mode === "select" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl pt-2">
          {/* Paste Recipe Option */}
          <button
            onClick={() => setMode("paste")}
            className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--background)] transition text-left space-y-3 group"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base">
                Paste Recipe
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Copy text or captions from Instagram, TikTok, Reels, or notes and paste them. AI automatically structures ingredients and steps.
              </p>
            </div>
          </button>

          {/* Import from URL Option */}
          <button
            onClick={() => setMode("url")}
            className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--background)] transition text-left space-y-3 group"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <LinkIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base">
                Import from URL
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Paste a web link or social media post URL. The app extracts text, captions, and images.
              </p>
            </div>
          </button>

          {/* Upload Screenshot Option */}
          <button
            onClick={() => setMode("screenshot")}
            className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--background)] transition text-left space-y-3 group"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base">
                Upload Screenshot
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Upload an image or screenshot of a recipe. Local OCR extracts the text and passes it to the parser.
              </p>
            </div>
          </button>

          {/* Create Manually Option */}
          <button
            onClick={startManual}
            className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--background)] transition text-left space-y-3 group"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base">
                Create Manually
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Directly type recipe title, ingredients, quantities, and steps using our structured editor.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Mode: Paste Text */}
      {mode === "paste" && (
        <div className="max-w-2xl p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--text-primary)]">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span>Paste Raw Recipe Text or Caption</span>
          </div>

          <textarea
            rows={10}
            required
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            disabled={isProcessing}
            placeholder={`High protein chicken pasta\n\n500g chicken breast\n300g pasta\n200g Greek yogurt\n30g parmesan\ngarlic, paprika, salt\n\nCook the pasta.\nSeason and cook chicken.\nMix yogurt and parmesan into warm pan.\nCombine everything.`}
            className="w-full p-4 text-xs sm:text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setMode("select")}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isProcessing || !pasteText.trim()}
              onClick={() => handleParse("text", pasteText)}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-medium text-xs shadow-xs transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  <span>{processingStatus || "Parsing..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Parse Recipe</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode: URL Import */}
      {mode === "url" && (
        <div className="max-w-2xl p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--text-primary)]">
            <LinkIcon className="w-4 h-4 text-[var(--accent)]" />
            <span>Enter Recipe or Video URL</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              URL (Instagram, TikTok, blog link, YouTube)
            </label>
            <input
              type="url"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isProcessing}
              placeholder="https://www.instagram.com/reel/..."
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setMode("select")}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isProcessing || !urlInput.trim()}
              onClick={() => handleParse("url", urlInput)}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-medium text-xs shadow-xs transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  <span>{processingStatus || "Importing..."}</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  <span>Import & Parse</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode: Screenshot OCR */}
      {mode === "screenshot" && (
        <div className="max-w-2xl p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--text-primary)]">
            <Camera className="w-4 h-4 text-[var(--accent)]" />
            <span>Upload Recipe Screenshot</span>
          </div>

          <div className="border border-dashed border-[var(--border)] bg-[var(--background)] rounded-2xl p-8 text-center space-y-3">
            {selectedImage ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Recipe screenshot preview"
                  className="max-h-64 mx-auto rounded-xl border border-[var(--border)] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="text-xs text-[var(--ui-error)] hover:underline"
                >
                  Remove & pick another image
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-[var(--text-secondary)] opacity-40 mx-auto mb-2" />
                <p className="text-xs text-[var(--text-primary)] font-medium">
                  Click to select an image from your device
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  PNG, JPG, or WebP screenshot
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-3 text-xs text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-[var(--accent-subtle)] file:text-[var(--accent)] hover:file:opacity-90"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setMode("select")}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isProcessing || !selectedImage}
              onClick={() => selectedImage && handleParse("image", selectedImage)}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-medium text-xs shadow-xs transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  <span>{processingStatus || "Scanning OCR..."}</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Scan & Parse Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode: Review Screen (Sections 8 & 9) */}
      {mode === "review" && parsedRecipe && (
        <RecipeReviewForm
          initialData={parsedRecipe}
          sourcePlatform={sourcePlatform}
          sourceUrl={sourceUrl}
          warnings={warnings}
          onCancel={() => setMode("select")}
        />
      )}
    </div>
  );
}
