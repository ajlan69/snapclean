"use client";

import { useRef } from "react";
import { BadgeCheck, Check, Lock, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/components/editor/editor-store";
import { cn } from "@/lib/utils";

interface GradientPreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

interface ImagePreset {
  id: string;
  label: string;
  url: string;
}

const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "grad-sunset", label: "Sunset", from: "#f97316", to: "#ef4444" },
  { id: "grad-ocean", label: "Ocean", from: "#0ea5e9", to: "#6366f1" },
  { id: "grad-violet", label: "Violet", from: "#7c3aed", to: "#ec4899" },
  { id: "grad-emerald", label: "Emerald", from: "#10b981", to: "#06b6d4" },
  { id: "grad-midnight", label: "Midnight", from: "#1e293b", to: "#0f172a" },
];

/**
 * Preset background photos served from Unsplash's CDN, which sends
 * `Access-Control-Allow-Origin: *` so the canvas export stays untainted.
 */
const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: "img-mountain",
    label: "Mountain",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-beach",
    label: "Beach",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-forest",
    label: "Forest",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-fog",
    label: "Fog",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-snow",
    label: "Snow",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80",
  },
];

const SOLID_SWATCHES = [
  "#ffffff",
  "#000000",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h4>
  );
}

/** Background replacer: transparent, solid colours, gradients, photos & upload. */
export default function BackgroundPanel() {
  const { isPro, background, activeBg, selectBackground, requirePro } =
    useEditor();
  const fileRef = useRef<HTMLInputElement>(null);

  const activeImage = background.type === "image" ? background.url : undefined;

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        selectBackground({ type: "image", url: reader.result }, "custom-image");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <section>
        <SectionTitle>Transparent</SectionTitle>
        <button
          type="button"
          onClick={() => selectBackground({ type: "transparent" }, "transparent")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-2 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeBg === "transparent"
              ? "border-primary ring-1 ring-primary"
              : "hover:border-primary/50"
          )}
        >
          <span className="h-8 w-8 shrink-0 rounded-md border bg-checkerboard" />
          <span className="font-medium">No background</span>
          {activeBg === "transparent" && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </button>
      </section>

      <section>
        <SectionTitle>Solid color</SectionTitle>
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label="Custom background color"
            value={background.type === "color" ? background.color : "#3b82f6"}
            onChange={(e) =>
              selectBackground(
                { type: "color", color: e.target.value },
                "custom-color"
              )
            }
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
          />
          <div className="flex flex-wrap gap-2">
            {SOLID_SWATCHES.map((color) => {
              const id = `solid-${color}`;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Set background ${color}`}
                  onClick={() => selectBackground({ type: "color", color }, id)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    "h-7 w-7 rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    activeBg === id &&
                      background.type === "color" &&
                      background.color === color &&
                      "ring-2 ring-primary ring-offset-1"
                  )}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Gradient</SectionTitle>
        <div className="grid grid-cols-5 gap-2">
          {GRADIENT_PRESETS.map((g) => {
            const active = activeBg === g.id && background.type === "gradient";
            return (
              <Tooltip key={g.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${g.label} gradient`}
                    onClick={() =>
                      selectBackground(
                        { type: "gradient", from: g.from, to: g.to },
                        g.id
                      )
                    }
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                    }}
                    className={cn(
                      "aspect-square w-full rounded-lg border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active && "ring-2 ring-primary ring-offset-1"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>{g.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Photo</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {IMAGE_PRESETS.map((img) => {
            const active = activeImage === img.url;
            return (
              <Tooltip key={img.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${img.label} background`}
                    onClick={() =>
                      selectBackground({ type: "image", url: img.url }, img.id)
                    }
                    className={cn(
                      "relative aspect-square w-full overflow-hidden rounded-lg border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.label}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{img.label}</TooltipContent>
              </Tooltip>
            );
          })}

          <button
            type="button"
            aria-label="Upload custom background"
            onClick={() => {
              if (isPro) fileRef.current?.click();
              else requirePro("Custom background uploads");
            }}
            className={cn(
              "relative flex aspect-square w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeImage?.startsWith("data:") &&
                "ring-2 ring-primary ring-offset-1"
            )}
          >
            {activeImage?.startsWith("data:") ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeImage}
                  alt="Custom background"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="relative z-10 rounded bg-black/50 px-1 text-white">
                  Custom
                </span>
              </>
            ) : (
              <>
                {isPro ? (
                  <Upload className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                <span>Upload</span>
              </>
            )}
            {!isPro && (
              <Badge
                variant="secondary"
                className="absolute right-1 top-1 flex items-center gap-0.5 px-1 py-0 text-[9px]"
              >
                <BadgeCheck className="h-2.5 w-2.5" />
                Pro
              </Badge>
            )}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </section>
    </div>
  );
}
