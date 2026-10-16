"use client";

import { Eraser, Lock, RefreshCw, ScanFace } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HighQualityToggle } from "@/components/editor/HighQualityToggle";
import { useEditor } from "@/components/editor/editor-store";

/** AI cutout tab: shows the isolated subject and lets users re-run removal. */
export default function CutoutPanel() {
  const { status, processedUrl, file, reprocess, requirePro } = useEditor();

  const ready = status === "ready" && Boolean(processedUrl);
  const processing = status === "processing";

  return (
    <div className="space-y-4">
      <HighQualityToggle />

      <p className="text-sm text-muted-foreground">
        The AI cutout isolates your subject automatically and runs entirely on
        your device — nothing is uploaded.
      </p>

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border bg-checkerboard">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={processedUrl ?? undefined}
            alt="AI cutout preview"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-muted-foreground">
            <ScanFace className="h-8 w-8" />
            <span className="text-xs">
              {processing
                ? "Isolating your subject…"
                : "Upload an image to create a cutout."}
            </span>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        className="w-full"
        disabled={!file || processing}
        onClick={() => reprocess()}
      >
        <RefreshCw className={processing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        Re-run AI cutout
      </Button>

      <button
        type="button"
        onClick={() => requirePro("Manual erase & edge refine")}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed p-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Eraser className="h-4 w-4" />
        <span className="flex-1">
          <span className="block font-medium text-foreground">
            Manual erase &amp; edge refine
          </span>
          Coming soon to Pro
        </span>
        <Lock className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
