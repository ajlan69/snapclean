"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { UploadZone } from "@/components/UploadZone";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { WaitlistButton, WaitlistDialog } from "@/components/WaitlistButton";
import {
  DEFAULT_ADJUSTMENTS,
  buildFilter,
  createThumbnail,
  downloadBlob,
  outputFilename,
  renderEditedImage,
  type Adjustments,
  type BackgroundOption,
} from "@/lib/photo";
import {
  FREE_DAILY_LIMIT,
  getGuestUsage,
  guestHasQuota,
  incrementGuestUsage,
} from "@/lib/usage";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";

// Pinned to the same version as package.json. Served as a native ES module.
const BACKGROUND_REMOVAL_CDN_URL =
  "https://esm.sh/@imgly/background-removal@1.7.0";

type Status = "idle" | "processing" | "ready" | "error";

interface EditorProps {
  plan: Plan;
  isAuthenticated: boolean;
  /** Server-provided usage for logged-in users. */
  initialUsed?: number;
  /** A file handed off from the landing page to process immediately. */
  autoFile?: File | null;
}

interface BackgroundPreset {
  id: string;
  label: string;
  swatch: string;
  option: BackgroundOption;
}

const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "transparent",
    label: "Transparent",
    swatch: "bg-checkerboard",
    option: { type: "transparent" },
  },
  {
    id: "white",
    label: "White",
    swatch: "bg-white",
    option: { type: "color", color: "#ffffff" },
  },
  {
    id: "black",
    label: "Black",
    swatch: "bg-black",
    option: { type: "color", color: "#000000" },
  },
  {
    id: "blue",
    label: "Blue",
    swatch: "bg-blue-600",
    option: { type: "color", color: "#2563eb" },
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "bg-gradient-to-br from-violet-600 to-pink-500",
    option: { type: "gradient", from: "#7c3aed", to: "#ec4899" },
  },
  {
    id: "sunset",
    label: "Sunset",
    swatch: "bg-gradient-to-br from-orange-500 to-red-500",
    option: { type: "gradient", from: "#f97316", to: "#ef4444" },
  },
  {
    id: "ocean",
    label: "Ocean",
    swatch: "bg-gradient-to-br from-sky-500 to-indigo-500",
    option: { type: "gradient", from: "#0ea5e9", to: "#6366f1" },
  },
];

export function Editor({ plan, isAuthenticated, initialUsed = 0, autoFile }: EditorProps) {
  const isPro = plan === "pro";

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [adjustments, setAdjustments] =
    useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [background, setBackground] = useState<BackgroundOption>({
    type: "transparent",
  });
  const [activeBg, setActiveBg] = useState("transparent");

  const [used, setUsed] = useState(isPro ? 0 : initialUsed);

  const originalUrlRef = useRef<string | null>(null);
  const autoProcessed = useRef(false);

  /**
   * Create an object URL for the transparent subject so the preview can render
   * it with live CSS filters. The filters/background are *not* baked in here —
   * that only happens on download via the canvas.
   */
  useEffect(() => {
    if (!processedBlob) {
      setProcessedUrl(null);
      return;
    }
    const url = URL.createObjectURL(processedBlob);
    setProcessedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [processedBlob]);

  /** Confirm the user has quota left before processing. */
  const canProcess = useCallback(async (): Promise<boolean> => {
    if (isPro) return true;

    if (!isAuthenticated) {
      if (guestHasQuota()) return true;
      setShowUpgrade(true);
      toast.error("Daily limit reached. Join the Pro waitlist for unlimited images.");
      return false;
    }

    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      const data = (await res.json()) as { used: number; limit: number };
      setUsed(data.used);
      if (data.used >= data.limit) {
        setShowUpgrade(true);
        toast.error("Daily limit reached. Join the Pro waitlist for unlimited images.");
        return false;
      }
      return true;
    } catch {
      // Fail open for authenticated users — the server still enforces limits.
      return true;
    }
  }, [isAuthenticated, isPro]);

  /** Persist usage + a lightweight history thumbnail after a successful run. */
  const recordUsage = useCallback(
    async (input: File, output: Blob) => {
      try {
        if (!isAuthenticated) {
          const count = incrementGuestUsage();
          setUsed(count);
          return;
        }

        const res = await fetch("/api/usage", { method: "POST" });
        const data = (await res.json()) as { used: number };
        setUsed(data.used);

        const [originalThumb, processedThumb] = await Promise.all([
          createThumbnail(input).catch(() => ""),
          createThumbnail(output).catch(() => ""),
        ]);

        await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_url: originalThumb,
            processed_url: processedThumb,
          }),
        });
      } catch (err) {
        console.error("Failed to record usage", err);
      }
    },
    [isAuthenticated]
  );

  /** Full pipeline: validate quota → remove background → record usage. */
  const handleFile = useCallback(
    async (input: File) => {
      const allowed = await canProcess();
      if (!allowed) return;

      // Clean up any previous object URL.
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      const nextOriginal = URL.createObjectURL(input);
      originalUrlRef.current = nextOriginal;

      setFile(input);
      setOriginalUrl(nextOriginal);
      setProcessedBlob(null);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setBackground({ type: "transparent" });
      setActiveBg("transparent");
      setStatus("processing");
      setProgress(0);

      try {
        // Loaded at runtime straight from the CDN (still fully client-side).
        // The package ships pre-bundled ESM that uses `import.meta` and a
        // self-referencing Web Worker; bundling it through webpack/Terser
        // breaks the build, so we let the browser load it as a native module.
        // The model + WASM assets are fetched from staticimgly.com by default.
        const { removeBackground } = (await import(
          /* webpackIgnore: true */ BACKGROUND_REMOVAL_CDN_URL
        )) as typeof import("@imgly/background-removal");

        const output = await removeBackground(input, {
          progress: (_key, current, total) => {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            setProgress((prev) => Math.max(prev, Math.min(99, pct)));
          },
        });

        setProcessedBlob(output);
        setProgress(100);
        setStatus("ready");
        toast.success("Background removed!");
        await recordUsage(input, output);
      } catch (err) {
        console.error("Background removal failed", err);
        setStatus("error");
        toast.error("Couldn't process that image. Please try another file.");
      }
    },
    [canProcess, recordUsage]
  );

  /** Bake the current settings into a PNG and download it. */
  const handleDownload = useCallback(async () => {
    if (!processedBlob) {
      toast.error("Nothing to download yet.");
      return;
    }
    setDownloading(true);
    try {
      const blob = await renderEditedImage(processedBlob, {
        adjustments,
        background,
        watermark: !isPro,
        maxDimension: isPro ? undefined : 1080,
      });
      downloadBlob(blob, outputFilename(file?.name ?? "image"));
      toast.success(isPro ? "HD image downloaded" : "Image downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [adjustments, background, file, isPro, processedBlob]);

  // Auto-process a file handed off from the landing page (runs once).
  useEffect(() => {
    if (autoFile && !autoProcessed.current) {
      autoProcessed.current = true;
      handleFile(autoFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFile]);

  const reset = useCallback(() => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    originalUrlRef.current = null;
    setFile(null);
    setOriginalUrl(null);
    setProcessedBlob(null);
    setStatus("idle");
    setProgress(0);
  }, []);

  const updateAdjustment = (key: keyof Adjustments, value: number) =>
    setAdjustments((prev) => ({ ...prev, [key]: value }));

  const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
  const usageLabel = isPro
    ? "Unlimited"
    : `${used}/${FREE_DAILY_LIMIT} today`;

  const enhancementsDirty = useMemo(
    () =>
      JSON.stringify(adjustments) !== JSON.stringify(DEFAULT_ADJUSTMENTS) ||
      background.type !== "transparent",
    [adjustments, background]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Preview column */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {status === "idle" ? "Upload an image" : "Preview"}
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant={isPro ? "success" : "secondary"}>
              {isPro ? "Pro" : "Free"}
            </Badge>
            <Badge variant="outline">{usageLabel}</Badge>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <UploadZone onFile={handleFile} />
            </motion.div>
          )}

          {status === "processing" && originalUrl && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-checkerboard"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalUrl}
                alt="Processing"
                className="h-full w-full object-contain opacity-40 blur-sm"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">
                  Removing background… {progress}%
                </p>
                <Progress value={progress} className="w-2/3" />
                <p className="text-xs text-muted-foreground">
                  Runs entirely on your device
                </p>
              </div>
            </motion.div>
          )}

          {status === "ready" && originalUrl && processedUrl && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <BeforeAfterSlider
                before={originalUrl}
                after={processedUrl}
                afterFilter={buildFilter(adjustments)}
                background={background}
                watermark={!isPro}
              />
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed"
            >
              <p className="text-sm text-muted-foreground">
                Something went wrong processing that image.
              </p>
              <Button onClick={reset} variant="outline">
                <RefreshCw className="h-4 w-4" />
                Try another image
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {status === "ready" && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isPro ? "Download HD PNG" : "Download PNG"}
            </Button>
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              New image
            </Button>
          </div>
        )}

        {/* Background controls, shown directly below the preview. */}
        {status === "ready" && (
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Background</h3>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setBackground(preset.option);
                    setActiveBg(preset.id);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-2 text-xs transition-all",
                    activeBg === preset.id
                      ? "border-primary ring-1 ring-primary"
                      : "hover:border-primary/50"
                  )}
                >
                  <span
                    className={cn("h-10 w-full rounded-md border", preset.swatch)}
                  />
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Solid color picker. */}
            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Custom color</p>
                <p className="text-xs text-muted-foreground">
                  Pick any solid background color.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-9 w-9 rounded-md border",
                    activeBg === "custom" && "ring-1 ring-primary"
                  )}
                  style={{
                    backgroundColor:
                      background.type === "color"
                        ? background.color
                        : "#3b82f6",
                  }}
                />
                <input
                  type="color"
                  aria-label="Custom background color"
                  value={
                    background.type === "color" ? background.color : "#3b82f6"
                  }
                  onChange={(e) => {
                    setBackground({ type: "color", color: e.target.value });
                    setActiveBg("custom");
                  }}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-0.5"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls column */}
      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Enhance</h3>
          </div>
          <div className="space-y-5">
            <SliderRow
              label="Brightness"
              value={adjustments.brightness}
              onChange={(v) => updateAdjustment("brightness", v)}
            />
            <SliderRow
              label="Contrast"
              value={adjustments.contrast}
              onChange={(v) => updateAdjustment("contrast", v)}
            />
            <SliderRow
              label="Saturation"
              value={adjustments.saturation}
              onChange={(v) => updateAdjustment("saturation", v)}
            />
            <SliderRow
              label="Blur"
              value={adjustments.blur}
              min={0}
              max={20}
              step={1}
              suffix="px"
              onChange={(v) => updateAdjustment("blur", v)}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 w-full"
            disabled={!enhancementsDirty}
            onClick={() => {
              setAdjustments(DEFAULT_ADJUSTMENTS);
              setBackground({ type: "transparent" });
              setActiveBg("transparent");
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset adjustments
          </Button>
        </div>

        {!isPro && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Go Pro</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {remaining > 0
                ? `You have ${remaining} free ${remaining === 1 ? "image" : "images"} left today.`
                : "You've hit today's free limit."}{" "}
              Remove watermarks, export in HD and process unlimited images.
            </p>
            <WaitlistButton
              label="Join Pro Waitlist"
              source="editor"
              className="mt-4 w-full"
            />
          </div>
        )}

        {/* Ad placeholder for free users only. */}
        <AdBanner slot="editor-bottom" showAds={!isPro} />
      </div>

      {/* Waitlist prompt shown when a free user runs out of quota. */}
      <WaitlistDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        source="editor-quota"
        title="You've reached today's free limit"
        description={`Free accounts can process ${FREE_DAILY_LIMIT} images per day. Join the Pro waitlist for unlimited images, HD downloads and no watermark.`}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min = 0,
  max = 200,
  step = 1,
  suffix = "%",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}