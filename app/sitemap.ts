import type { MetadataRoute } from "next";

import { getAppBaseUrl } from "@/lib/app-url";

const appUrl = getAppBaseUrl();

/** Sitemap for the public routes. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/editor", "/login", "/signup", "/privacy", "/terms", "/contact"];

  return routes.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}