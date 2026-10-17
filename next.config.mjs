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
  webpack(config) {
    // We reuse only the pure matting math from `@pixir/background-remover`
    // (bilinear reconstruction + guided filter). ONNX Runtime itself is loaded
    // from the CDN via importScripts inside `workers/matting.worker.ts`, so its
    // `onnxruntime-web` import is aliased away to keep it out of the bundle
    // (and out of the worker, which would break webpack's worker handling).
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "onnxruntime-web": false,
    };
    return config;
  },
};

export default nextConfig;
