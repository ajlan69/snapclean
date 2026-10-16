"use client";

import { Sparkles } from "lucide-react";

import { SliderRow } from "@/components/editor/SliderRow";

/** Colour-grade effects: grayscale and sepia, with more on the way. */
export function EffectsPanel() {
  return (
    <div className="space-y-5">
      <SliderRow label="Grayscale" adjustKey="grayscale" />
      <SliderRow label="Sepia" adjustKey="sepia" />

      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          More effects coming soon
        </p>
        <p className="mt-1">Vintage, vignette and duotone are on the way.</p>
      </div>
    </div>
  );
}
