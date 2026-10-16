import type { MetadataRoute } from "next";

import { getAppBaseUrl } from "@/lib/app-url";

const appUrl = getAppBaseUrl();

/** robots.txt — allow crawling of public pages, block private areas. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/auth/", "/login", "/signup"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}