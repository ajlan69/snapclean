"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SliderRow } from "@/components/editor/SliderRow";
import { useEditor } from "@/components/editor/editor-store";
import { DEFAULT_ADJUSTMENTS } from "@/lib/photo";

/** Brightness / contrast / saturation / blur adjustments. */
export function EnhancePanel() {
  const { adjustments, background, activeBg, commitSnapshot } = useEditor();

  const dirty =
    JSON.stringify(adjustments) !== JSON.stringify(DEFAULT_ADJUSTMENTS);

  const handleReset = () =>
    commitSnapshot(
      { adjustments, background, activeBg },
      { adjustments: DEFAULT_ADJUSTMENTS, background, activeBg }
    );

  return (
    <div className="space-y-5">
      <SliderRow label="Brightness" adjustKey="brightness" />
      <SliderRow label="Contrast" adjustKey="contrast" />
      <SliderRow label="Saturation" adjustKey="saturation" />
      <SliderRow label="Blur" adjustKey="blur" min={0} max={20} suffix="px" />

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        disabled={!dirty}
        onClick={handleReset}
      >
        <RotateCcw className="h-4 w-4" />
        Reset enhancements
      </Button>
    </div>
  );
}
