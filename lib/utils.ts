import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with support for conditional class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with thousands separators (e.g. 12,483).
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/**
 * Format a timestamp as a human readable date.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Cap a value between a min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a unique id (used for client-side image history).
 */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Validate that a file is an accepted image type within the size limit.
 */
export function isValidImageFile(
  file: File,
  maxBytes = 10 * 1024 * 1024,
  allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
): { ok: boolean; error?: string } {
  if (!file) return { ok: false, error: "No file selected." };
  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error: "Unsupported format. Please upload JPG, PNG or WEBP.",
    };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: "File is too large. Maximum size is 10MB.",
    };
  }
  return { ok: true };
}

/**
 * Get the value of a single stripe query parameter safely.
 */
export function getParam(
  params: URLSearchParams,
  key: string
): string | null {
  return params.get(key);
}

/**
 * Day key used for client-side daily quota tracking (local storage).
 * Uses the local date so the quota resets at midnight in the user's timezone.
 */
export function getDayKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}