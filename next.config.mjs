/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOTE: `@imgly/background-removal` is intentionally NOT bundled. Its
  // pre-bundled ESM uses `import.meta` and a self-referencing Web Worker that
  // break webpack/Terser. Instead it is imported at runtime from the CDN in
  // `components/Editor.tsx` (see BACKGROUND_REMOVAL_CDN_URL), so it never
  // enters the webpack graph.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Security headers. Cross-Origin-Embedder-Policy is intentionally omitted so
  // that the background-removal WASM assets can be fetched from the CDN.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
