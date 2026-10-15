/**
 * Absolute base URL of the deployed app.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL — set explicitly in Vercel (Production/Preview).
 *   2. VERCEL_URL — the deployment URL Vercel injects at build time.
 *   3. http://localhost:3000 — local development only.
 *
 * Never hardcode localhost as the production fallback: doing so leaks into
 * canonical URLs, sitemaps, robots.txt, metadata and Stripe redirects.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
