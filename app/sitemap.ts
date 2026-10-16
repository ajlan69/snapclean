import type { MetadataRoute } from "next";

import { getAppBaseUrl } from "@/lib/app-url";

// Resolved from NEXT_PUBLIC_SITE_URL (see lib/app-url.ts), so production
// builds emit the canonical https://snapclean-nine.vercel.app origin.
const appUrl = getAppBaseUrl();

/**
 * Public, indexable routes.
 * Auth pages (/login, /signup) and the authenticated /dashboard are excluded.
 */
const ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/editor", changeFrequency: "weekly", priority: 0.9 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
];

/** Sitemap for the public routes. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${appUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
