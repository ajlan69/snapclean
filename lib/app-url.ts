/**
 * Absolute base URL of the deployed app.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL  — the standard Next.js / Supabase variable.
 *   2. NEXT_PUBLIC_APP_URL   — legacy name, still supported.
 *   3. VERCEL_URL            — the deployment URL Vercel injects at build time
 *                              (note: it has no protocol; we add https://).
 *   4. http://localhost:3000 — local development only.
 *
 * The raw value is normalised so it is ALWAYS a valid absolute URL:
 *   - trimmed,
 *   - a missing scheme is filled in (https:// by default, http:// for localhost),
 *   - trailing slashes are removed.
 *
 * This matters because the result feeds `new URL(...)` in `app/layout.tsx`.
 * A scheme-less value such as `snapclean-nine.vercel.app` makes `new URL()`
 * throw `ERR_INVALID_URL`, which crashes the root layout and takes every page
 * (including /login) down with a server-side exception.
 *
 * Never hardcode localhost as the production fallback: doing so leaks into
 * canonical URLs, sitemaps, robots.txt, metadata and Stripe redirects.
 */

const LOCALHOST_FALLBACK = "http://localhost:3000";

/** Fill in a missing scheme and strip trailing slashes. */
function normalise(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  // Add a scheme when one is missing: localhost keeps http, everything else https.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `${/^localhost(:\d+)?$/i.test(trimmed) ? "http" : "https"}://${trimmed}`;

  // Validate. If it is still not a usable absolute URL, reject it so the
  // caller can fall through to the next source rather than throwing.
  try {
    const parsed = new URL(withScheme);
    if (!parsed.hostname) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getAppBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalised = normalise(candidate);
    if (normalised) return normalised;
  }

  return LOCALHOST_FALLBACK;
}

/**
 * Guaranteed-valid URL object for `metadataBase`. Never throws, so a
 * misconfigured environment variable cannot bring the whole site down.
 */
export function getMetadataBase(): URL {
  return new URL(getAppBaseUrl());
}
