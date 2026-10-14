"use client";

import { useCallback, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { backgroundToStyle, type BackgroundOption } from "@/lib/photo";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  before: string;
  after: string;
  /** CSS filter string applied live to the processed image. */
  afterFilter?: string;
  /** Background painted behind the processed subject. */
  background?: BackgroundOption;
  /** When true, a "Made with SnapClean" badge is overlaid (free tier). */
  watermark?: boolean;
  className?: string;
}

/**
 * Interactive before/after comparison slider.
 * Drag the handle (or click anywhere) to reveal the processed image.
 *
 * The "after" side is rendered with plain CSS (filter + background) so it
 * updates instantly as the sliders move, then the same filter/background are
 * baked into the PNG at download time via the canvas.
 */
export function BeforeAfterSlider({
  before,
  after,
  afterFilter,
  background,
  watermark = false,
  className,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  const transparent = !background || background.type === "transparent";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-square w-full select-none overflow-hidden rounded-2xl border",
        transparent && "bg-checkerboard",
        className
      )}
      style={backgroundToStyle(background ?? { type: "transparent" })}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* After (processed) image fills the frame, live CSS filters applied. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after}
        alt="Processed"
        className="absolute inset-0 h-full w-full object-contain"
        style={afterFilter ? { filter: afterFilter } : undefined}
        draggable={false}
      />

      {/* Before (original) image clipped to the left of the handle. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before}
          alt="Original"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      </div>

      {/* Divider + handle. */}
      <div
        className="absolute inset-y-0 z-10 w-0.5 cursor-ew-resize bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg ring-2 ring-black/10">
          <GripVertical className="h-5 w-5" />
        </div>
      </div>

      {/* Labels. */}
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-white">
        After
      </span>

      {/* Watermark preview (mirrors the burned-in export watermark). */}
      {watermark && (
        <span className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/35 px-2 py-1 text-xs font-semibold text-white/90">
          Made with SnapClean
        </span>
      )}
    </div>
  );
}
