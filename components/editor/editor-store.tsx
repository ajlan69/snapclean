"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  DEFAULT_ADJUSTMENTS,
  FREE_EXPORT_MAX_DIMENSION,
  createThumbnail,
  downloadBlob,
  outputFilename,
  renderEditedImage,
  type Adjustments,
  type BackgroundOption,
} from "@/lib/photo";
import {
  FREE_DAILY_LIMIT,
  guestHasQuota,
  incrementGuestUsage,
} from "@/lib/usage";
import {
  isHighQualitySupported,
  isLowMemoryDevice,
  removeBackgroundHighQuality,
} from "@/lib/birefnet";
import type { Plan } from "@/lib/types";

// Pinned to the same version as package.json. Served as a native ES module.
const BACKGROUND_REMOVAL_CDN_URL =
  "https://esm.sh/@imgly/background-removal@1.7.0";

export type EditorStatus = "idle" | "processing" | "ready" | "error";

/** The slice of editor state that participates in undo/redo. */
export interface EditorSnapshot {
  adjustments: Adjustments;
  background: BackgroundOption;
  activeBg: string;
}

export const INITIAL_SNAPSHOT: EditorSnapshot = {
  adjustments: DEFAULT_ADJUSTMENTS,
  background: { type: "transparent" },
  activeBg: "transparent",
};

interface HistoryState {
  past: EditorSnapshot[];
  present: EditorSnapshot;
  future: EditorSnapshot[];
}

interface EditorContextValue extends EditorSnapshot {
  plan: Plan;
  isPro: boolean;
  isAuthenticated: boolean;

  status: EditorStatus;
  progress: number;
  progressLabel: string;
  highQuality: boolean;
  hqSupported: boolean;
  setHighQuality: (enabled: boolean) => void;
  file: File | null;
  originalUrl: string | null;
  processedUrl: string | null;
  downloading: boolean;
  used: number;
  remaining: number;

  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;

  showUpgrade: boolean;
  setShowUpgrade: (open: boolean) => void;

  handleFile: (file: File) => void;
  handleDownload: () => void;
  reset: () => void;
  reprocess: () => void;

  /** Live (throttled) slider preview — does not touch history. */
  previewAdjustment: (key: keyof Adjustments, value: number) => void;
  /** Commit a slider change to history (called on pointer-up). */
  commitSnapshot: (previous: EditorSnapshot, next: EditorSnapshot) => void;
  selectBackground: (option: BackgroundOption, id: string) => void;
  resetAll: () => void;

  undo: () => void;
  redo: () => void;
  requirePro: (feature?: string) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

/** Access the editor store. Must be used inside <EditorProvider>. */
export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within an EditorProvider");
  return ctx;
}

interface EditorProviderProps {
  plan: Plan;
  isAuthenticated: boolean;
  initialUsed?: number;
  autoFile?: File | null;
  children: ReactNode;
}

export function EditorProvider({
  plan,
  isAuthenticated,
  initialUsed = 0,
  autoFile,
  children,
}: EditorProviderProps) {
  const isPro = plan === "pro";

  const [status, setStatus] = useState<EditorStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Removing background…");
  const [highQuality, setHighQualityState] = useState(false);
  const [hqSupported, setHqSupported] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [used, setUsed] = useState(isPro ? 0 : initialUsed);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: INITIAL_SNAPSHOT,
    future: [],
  });

  const originalUrlRef = useRef<string | null>(null);
  const autoProcessed = useRef(false);

  // requestAnimationFrame throttle for live slider previews.
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ key: keyof Adjustments; value: number } | null>(
    null
  );

  /** Object URL for the transparent subject (baked only on download). */
  useEffect(() => {
    if (!processedBlob) {
      setProcessedUrl(null);
      return;
    }
    const url = URL.createObjectURL(processedBlob);
    setProcessedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [processedBlob]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    setHqSupported(isHighQualitySupported());
  }, []);

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
      return true;
    }
  }, [isAuthenticated, isPro]);

  const recordUsage = useCallback(
    async (input: File, output: Blob) => {
      try {
        if (!isAuthenticated) {
          setUsed(incrementGuestUsage());
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

  /** Run AI background removal on a file, resetting edits on success. */
  const runRemoval = useCallback(
    async (input: File): Promise<Blob | null> => {
      setStatus("processing");
      setProgress(0);
      setHistory({ past: [], present: INITIAL_SNAPSHOT, future: [] });

      const useHighQuality = highQuality && isPro && isHighQualitySupported();

      if (useHighQuality) {
        try {
          setProgressLabel("Downloading high-quality AI model…");
          const output = await removeBackgroundHighQuality(input, (p) => {
            if (p.phase === "model") {
              setProgressLabel("Downloading high-quality AI model…");
              const { loaded = 0, total = 0 } = p;
              if (total > 0) {
                setProgress((prev) =>
                  Math.max(prev, Math.min(80, Math.round((loaded / total) * 80)))
                );
              }
            } else {
              setProgressLabel("Applying high-quality matting…");
              setProgress((prev) => Math.max(prev, 85));
            }
          });

          setProcessedBlob(output);
          setProgress(100);
          setStatus("ready");
          return output;
        } catch (err) {
          console.warn(
            "[birefnet] high-quality removal failed, falling back to standard",
            err
          );
          toast.message(
            "High-quality mode unavailable — using the standard remover."
          );
        }
      }

      try {
        setProgressLabel("Removing background…");
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
        return output;
      } catch (err) {
        console.error("Background removal failed", err);
        setStatus("error");
        toast.error("Couldn't process that image. Please try another file.");
        return null;
      }
    },
    [highQuality, isPro]
  );

  const handleFile = useCallback(
    async (input: File) => {
      const allowed = await canProcess();
      if (!allowed) return;

      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      const nextOriginal = URL.createObjectURL(input);
      originalUrlRef.current = nextOriginal;

      setFile(input);
      setOriginalUrl(nextOriginal);
      setProcessedBlob(null);

      const output = await runRemoval(input);
      if (output) {
        toast.success("Background removed!");
        await recordUsage(input, output);
      }
    },
    [canProcess, recordUsage, runRemoval]
  );

  /** Re-run the AI cutout on the current file (no extra quota consumed). */
  const reprocess = useCallback(async () => {
    if (!file) return;
    const output = await runRemoval(file);
    if (output) toast.success("Cutout refreshed");
  }, [file, runRemoval]);

  const handleDownload = useCallback(async () => {
    if (!processedBlob) {
      toast.error("Nothing to download yet.");
      return;
    }
    setDownloading(true);
    try {
      const { adjustments, background } = history.present;
      const blob = await renderEditedImage(processedBlob, {
        adjustments,
        background,
        maxDimension: isPro ? undefined : FREE_EXPORT_MAX_DIMENSION,
      });
      downloadBlob(blob, outputFilename(file?.name ?? "image"));
      toast.success(
        isPro ? "Full-resolution image downloaded" : "720p image downloaded"
      );
    } catch (err) {
      console.error(err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [file, history.present, isPro, processedBlob]);

  const reset = useCallback(() => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    originalUrlRef.current = null;
    setFile(null);
    setOriginalUrl(null);
    setProcessedBlob(null);
    setStatus("idle");
    setProgress(0);
    setHistory({ past: [], present: INITIAL_SNAPSHOT, future: [] });
  }, []);

  /** Live, rAF-throttled adjustment preview (no history entry). */
  const previewAdjustment = useCallback(
    (key: keyof Adjustments, value: number) => {
      pendingRef.current = { key, value };
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (!pending) return;
        setHistory((h) => ({
          ...h,
          present: {
            ...h.present,
            adjustments: { ...h.present.adjustments, [pending.key]: pending.value },
          },
        }));
      });
    },
    []
  );

  /** Commit a change to history (push previous, clear redo stack). */
  const commitSnapshot = useCallback(
    (previous: EditorSnapshot, next: EditorSnapshot) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = null;
      setHistory((h) => ({
        past: [...h.past, previous],
        present: next,
        future: [],
      }));
    },
    []
  );

  const selectBackground = useCallback(
    (option: BackgroundOption, id: string) => {
      setHistory((h) => ({
        past: [...h.past, h.present],
        present: { ...h.present, background: option, activeBg: id },
        future: [],
      }));
    },
    []
  );

  const resetAll = useCallback(() => {
    setHistory((h) => ({
      past: [...h.past, h.present],
      present: INITIAL_SNAPSHOT,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
      };
    });
  }, []);

  const requirePro = useCallback((feature = "This feature") => {
    setShowUpgrade(true);
    toast.error(`${feature} is a Pro feature.`);
  }, []);

  const setHighQuality = useCallback(
    (enabled: boolean) => {
      if (enabled && !isPro) {
        requirePro("High Quality cutout");
        return;
      }
      setHighQualityState(enabled);
      if (enabled && isLowMemoryDevice()) {
        toast.warning(
          "High Quality uses a lot of memory and may be slow on this device."
        );
      }
    },
    [isPro, requirePro]
  );

  // Auto-process a file handed off from the landing page (runs once).
  useEffect(() => {
    if (autoFile && !autoProcessed.current) {
      autoProcessed.current = true;
      handleFile(autoFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFile]);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - used);

  const dirty = useMemo(
    () => JSON.stringify(history.present) !== JSON.stringify(INITIAL_SNAPSHOT),
    [history.present]
  );

  const value = useMemo<EditorContextValue>(
    () => ({
      ...history.present,
      plan,
      isPro,
      isAuthenticated,
      status,
      progress,
      progressLabel,
      highQuality,
      hqSupported,
      setHighQuality,
      file,
      originalUrl,
      processedUrl,
      downloading,
      used,
      remaining,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      dirty,
      showUpgrade,
      setShowUpgrade,
      handleFile,
      handleDownload,
      reset,
      reprocess,
      previewAdjustment,
      commitSnapshot,
      selectBackground,
      resetAll,
      undo,
      redo,
      requirePro,
    }),
    [
      history.present,
      history.past.length,
      history.future.length,
      plan,
      isPro,
      isAuthenticated,
      status,
      progress,
      progressLabel,
      highQuality,
      hqSupported,
      setHighQuality,
      file,
      originalUrl,
      processedUrl,
      downloading,
      used,
      remaining,
      dirty,
      showUpgrade,
      handleFile,
      handleDownload,
      reset,
      reprocess,
      previewAdjustment,
      commitSnapshot,
      selectBackground,
      resetAll,
      undo,
      redo,
      requirePro,
    ]
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
