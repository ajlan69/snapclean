"use client";

import { getDayKey } from "@/lib/utils";

export const FREE_DAILY_LIMIT = 10;
const STORAGE_KEY = "snapclean_usage";

export interface LocalUsage {
  [dayKey: string]: number;
}

/**
 * LocalStorage-backed daily usage tracker for anonymous (guest) users.
 */
function readLocalUsage(): LocalUsage {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalUsage) : {};
  } catch {
    return {};
  }
}

function writeLocalUsage(usage: LocalUsage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // Storage might be unavailable (private mode) — fail silently.
  }
}

/**
 * Get the guest usage count for today.
 */
export function getGuestUsage(now = new Date()): number {
  return readLocalUsage()[getDayKey(now)] ?? 0;
}

/**
 * Increment the guest usage count for today and return the new count.
 */
export function incrementGuestUsage(now = new Date()): number {
  const usage = readLocalUsage();
  const key = getDayKey(now);
  usage[key] = (usage[key] ?? 0) + 1;
  writeLocalUsage(usage);
  return usage[key];
}

/**
 * Check whether a guest still has quota for processing today.
 */
export function guestHasQuota(now = new Date()): boolean {
  return getGuestUsage(now) < FREE_DAILY_LIMIT;
}