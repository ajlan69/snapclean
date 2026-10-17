"use client";

import { Info, Sparkles } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/components/editor/editor-store";
import { cn } from "@/lib/utils";

/** Switch that routes cutouts through the BiRefNet matting model. */
export function HighQualityToggle() {
  const { highQuality, setHighQuality, hqSupported } = useEditor();

  const active = highQuality && hqSupported;
  const unavailable = !hqSupported;

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
              Uses advanced AI matting for precise hair and edge details. Slower
              but higher quality.
            </TooltipContent>
          </Tooltip>
        </div>

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

      <p className="mt-2 text-xs text-muted-foreground">
        {unavailable
          ? "Not supported in this browser."
          : "First run downloads the AI model (~300 MB) and caches it offline. Re-run the cutout to apply."}
      </p>
    </div>
  );
}
