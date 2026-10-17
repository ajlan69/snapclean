"use client";

/**
 * Feathers the alpha channel of a transparent cutout.
 *
 * Only the *alpha mask* is blurred — never the subject pixels — so the cutout's
 * RGB stays perfectly crisp while the mask boundary is softened (which helps
 * flyaway hair and fur blend naturally). The feathered mask is then composited
 * back over the untouched image with `destination-in`, which multiplies the
 * existing alpha by the mask alpha, so the background is never resurrected and
 * no halo is introduced.
 *
 * @param source Transparent cutout (RGBA PNG/WebP) produced by the model.
 * @param radius Feather radius in pixels (0 disables feathering).
 */
export async function featherAlpha(source: Blob, radius: number): Promise<Blob> {
  const px = Math.max(0, Math.min(6, Math.round(radius)));
  if (px <= 0 || typeof document === "undefined") return source;

  const bitmap = await createImageBitmap(source);
  const width = bitmap.width;
  const height = bitmap.height;

  // (b) Blurred mask: drawing the cutout through a blur filter blurs its alpha
  // channel. The mask canvas is transparent, so only the alpha is meaningful.
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) {
    bitmap.close();
    return source;
  }
  // (c) Apply the blur to the mask only.
  maskCtx.filter = `blur(${px}px)`;
  maskCtx.drawImage(bitmap, 0, 0, width, height);

  // (d) Draw the untouched cutout on the main canvas.
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return source;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  // (e) Keep only the feathered alpha: dest.alpha = dest.alpha * mask.alpha.
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);

  bitmap.close();

  return await new Promise<Blob>((resolve) => {
    out.toBlob((blob) => resolve(blob ?? source), "image/png");
  });
}
