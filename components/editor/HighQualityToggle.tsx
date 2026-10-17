"use client";

import { useEffect, useState } from "react";
import { Cpu, Info, Sparkles, Zap } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/components/editor/editor-store";
import { supportsWebGPU } from "@/lib/matting";
import { cn } from "@/lib/utils";

/** Switch that routes cutouts through the RMBG-1.4 matting model. */
export function HighQualityToggle() {
  const { highQuality, setHighQuality, hqSupported, mattingDevice } =
    useEditor();

  // Avoid a server/client hydration mismatch for the capability hint: only
  // trust WebGPU detection after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = highQuality && hqSupported;
  const unavailable = !hqSupported;
  // Prefer the provider the model actually ran on; fall back to a capability
  // hint before the first cutout has run.
  const gpu =
    mattingDevice === "webgpu" ||
    (mounted && !mattingDevice && supportsWebGPU());

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        active && "border-primary/60 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-medium">High Quality</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="About High Quality mode"
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              RMBG-1.4 matting with a guided-filter edge refiner keeps hair, fur
              and semi-transparent edges clean. Runs entirely on your device.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {active && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    gpu
                      ? "border-primary/40 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {gpu ? (
                    <Zap className="h-3 w-3" />
                  ) : (
                    <Cpu className="h-3 w-3" />
                  )}
                  {gpu ? "WebGPU" : "WASM"}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {gpu
                  ? "Accelerated with WebGPU — fast, hardware-backed inference."
                  : "Running on single-threaded WASM. WebGPU (Chrome/Edge) is faster."}
              </TooltipContent>
            </Tooltip>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label="Toggle high quality cutout"
            disabled={unavailable}
            onClick={() => setHighQuality(!active)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "bg-primary" : "bg-muted",
              unavailable && "cursor-not-allowed opacity-50"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform",
                active ? "translate-x-[1.125rem]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {unavailable
          ? "Not supported in this browser."
          : "A ~42 MB model downloads once and caches offline, then runs in seconds. Re-run the cutout to apply."}
      </p>
    </div>
  );
}
