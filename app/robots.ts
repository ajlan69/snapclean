import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** robots.txt — allow crawling of public pages, block private areas. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/auth/"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}