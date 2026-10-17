"use client";

/**
 * Client-side image composition utilities.
 * All processing happens in the browser via the Canvas API — images are never
 * uploaded to a server.
 */

export interface Adjustments {
  /** 0–200, 100 = unchanged */
  brightness: number;
  /** 0–200, 100 = unchanged */
  contrast: number;
  /** 0–200, 100 = unchanged */
  saturation: number;
  /** 0–20px, 0 = unchanged */
  blur: number;
  /** 0–100, 0 = unchanged */
  grayscale: number;
  /** 0–100, 0 = unchanged */
  sepia: number;
}

export type BackgroundOption =
  | { type: "transparent" }
  | { type: "color"; color: string }
  | { type: "gradient"; from: string; to: string }
  | { type: "image"; url: string };

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
};

/**
 * Load an image (Blob / File / URL) into an HTMLImageElement.
 */
export function loadImage(src: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
    image.src = url;
  });
}

/**
 * Convert a canvas to a PNG blob.
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export image."))),
      "image/png",
      0.95
    );
  });
}

/**
 * Build the CSS filter string used to apply basic enhancements.
 * Exported so the live preview (`<img style={{ filter }} />`) and the canvas
 * export use the *exact same* filter, guaranteeing WYSIWYG output.
 */
export function buildFilter(a: Adjustments): string {
  const parts = [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturation}%)`,
  ];
  // `blur(0px)` is a no-op, so only emit it when the user actually blurs.
  if (a.blur > 0) parts.push(`blur(${a.blur}px)`);
  // Similarly, skip the no-op grayscale/sepia filters.
  if (a.grayscale > 0) parts.push(`grayscale(${a.grayscale}%)`);
  if (a.sepia > 0) parts.push(`sepia(${a.sepia}%)`);
  return parts.join(" ");
}

/**
 * Convert a background option into inline CSS for the preview layer.
 * Transparent returns an empty object so the checkerboard shows through.
 */
export function backgroundToStyle(background: BackgroundOption): {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
} {
  if (background.type === "color") {
    return { backgroundColor: background.color };
  }
  if (background.type === "gradient") {
    return {
      backgroundImage: `linear-gradient(135deg, ${background.from}, ${background.to})`,
    };
  }
  if (background.type === "image") {
    return {
      backgroundImage: `url("${background.url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return {};
}

/**
 * Draw an image scaled to completely cover a width×height box, centered
 * (the canvas equivalent of CSS `background-size: cover`).
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;

  const scale = Math.max(width / iw, height / ih);
  const drawWidth = iw * scale;
  const drawHeight = ih * scale;
  ctx.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
}

/**
 * Trace a rounded-rectangle path (works around inconsistent `roundRect`
 * support across browsers/type libs).
 */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * Stamp the free-tier "Made with SnapClean" watermark in the bottom-right
 * corner. Drawn on a translucent pill so it stays legible over any background
 * (including transparency).
 */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const text = "Made with SnapClean";
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.035));

  ctx.save();
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(text).width;
  const padX = fontSize * 0.7;
  const padY = fontSize * 0.5;
  const boxWidth = textWidth + padX * 2;
  const boxHeight = fontSize + padY * 2;
  const margin = Math.max(12, Math.round(Math.min(width, height) * 0.03));
  const x = Math.max(margin, width - boxWidth - margin);
  const y = Math.max(margin, height - boxHeight - margin);

  ctx.fillStyle = "rgba(17, 17, 19, 0.6)";
  roundRectPath(ctx, x, y, boxWidth, boxHeight, boxHeight / 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillText(text, x + padX, y + boxHeight / 2 + 1);
  ctx.restore();
}

/**
 * Paint the selected background behind the (transparent) subject.
 * Only image backgrounds need to load an asset, so this is async.
 */
async function paintBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: BackgroundOption
) {
  if (background.type === "transparent") return;

  if (background.type === "color") {
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (background.type === "image") {
    // Cross-origin images are loaded with CORS so the canvas stays untainted
    // and `toBlob` can export. Remote presets (Unsplash) send the required
    // `Access-Control-Allow-Origin` header.
    const image = await loadImage(background.url);
    drawImageCover(ctx, image, width, height);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, background.from);
  gradient.addColorStop(1, background.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Longest-edge cap for free-tier exports (720p-class, ~1280px). Pro exports
 * are unbounded and keep the original resolution.
 */
export const FREE_EXPORT_MAX_DIMENSION = 1280;

export interface RenderOptions {
  adjustments?: Adjustments;
  background?: BackgroundOption;
  /**
   * Cap the longest edge of the exported image. Free users pass
   * `FREE_EXPORT_MAX_DIMENSION`; Pro users pass `undefined` to export at full
   * (HD) resolution.
   */
  maxDimension?: number;
  /**
   * Stamp the "Made with SnapClean" watermark. Free users get it on every
   * export (including High Quality cutouts); Pro exports are clean.
   */
  watermark?: boolean;
}

/**
 * Compose the final image: optional background, enhancements and free-tier
 * watermark. Returns a PNG blob ready for download.
 */
export async function renderEditedImage(
  source: Blob | string,
  {
    adjustments = DEFAULT_ADJUSTMENTS,
    background = { type: "transparent" },
    maxDimension,
    watermark = false,
  }: RenderOptions = {}
): Promise<Blob> {
  const image = await loadImage(source);

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;

  // Optionally downscale the export while preserving aspect ratio.
  let width = naturalWidth;
  let height = naturalHeight;
  if (maxDimension && Math.max(naturalWidth, naturalHeight) > maxDimension) {
    const scale = maxDimension / Math.max(naturalWidth, naturalHeight);
    width = Math.round(naturalWidth * scale);
    height = Math.round(naturalHeight * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  // 1. Background layer.
  await paintBackground(ctx, canvas.width, canvas.height, background);

  // 2. Enhanced subject layer.
  ctx.filter = buildFilter(adjustments);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  // 3. Free-tier watermark (baked in so it can't be removed client-side).
  if (watermark) drawWatermark(ctx, canvas.width, canvas.height);

  return canvasToBlob(canvas);
}

/**
 * Trigger a browser download for a blob.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate a filename for the processed image.
 */
export function outputFilename(originalName: string, suffix = "snapclean"): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return `${base}-${suffix}.png`;
}

/**
 * Produce a small JPEG data URL used to persist a lightweight preview of a
 * processed image in the database without uploading the full-resolution file.
 */
export async function createThumbnail(
  source: Blob | string,
  maxSize = 360
): Promise<string> {
  const image = await loadImage(source);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  // Flatten transparency onto white so the thumbnail is a compact JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.6);
}