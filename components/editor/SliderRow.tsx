"use client";

import { useRef } from "react";
import { RotateCcw } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import {
  useEditor,
  type EditorSnapshot,
} from "@/components/editor/editor-store";
import { DEFAULT_ADJUSTMENTS, type Adjustments } from "@/lib/photo";
import { cn } from "@/lib/utils";

interface SliderRowProps {
  label: string;
  adjustKey: keyof Adjustments;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered after the numeric value, e.g. "%" or "px". */
  suffix?: string;
  className?: string;
}

/**
 * A labelled slider wired to the editor store.
 *
 * Live drags are throttled through `previewAdjustment` (no history churn);
 * the change is pushed onto the undo stack once on pointer-up via
 * `commitSnapshot`, using the snapshot captured at the start of the drag.
 */
export function SliderRow({
  label,
  adjustKey,
  min = 0,
  max = 200,
  step = 1,
  suffix = "%",
  className,
}: SliderRowProps) {
  const {
    adjustments,
    background,
    activeBg,
    previewAdjustment,
    commitSnapshot,
  } = useEditor();

  const startRef = useRef<EditorSnapshot | null>(null);

  const value = adjustments[adjustKey];
  const defaultValue = DEFAULT_ADJUSTMENTS[adjustKey];
  const isDefault = value === defaultValue;

  const currentSnapshot = (): EditorSnapshot => ({
    adjustments,
    background,
    activeBg,
  });

  const handleChange = (values: number[]) => {
    if (!startRef.current) startRef.current = currentSnapshot();
    previewAdjustment(adjustKey, values[0]);
  };

  const handleCommit = (values: number[]) => {
    const previous = startRef.current ?? currentSnapshot();
    startRef.current = null;
    commitSnapshot(previous, {
      ...previous,
      adjustments: { ...previous.adjustments, [adjustKey]: values[0] },
    });
  };

  const handleReset = () => {
    const previous = currentSnapshot();
    commitSnapshot(previous, {
      ...previous,
      adjustments: { ...previous.adjustments, [adjustKey]: defaultValue },
    });
  };

  return (
    <div className={cn("group", className)}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums text-muted-foreground">
            {value}
            {suffix}
          </span>
          <button
            type="button"
            aria-label={`Reset ${label}`}
            disabled={isDefault}
            onClick={handleReset}
            className={cn(
              "rounded p-0.5 text-muted-foreground transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isDefault
                ? "pointer-events-none opacity-0"
                : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
        aria-label={label}
      />
    </div>
  );
}
