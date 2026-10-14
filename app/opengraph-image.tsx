import { ImageResponse } from "next/og";

// Route segment config for the generated OpenGraph image.
export const runtime = "edge";
export const alt = "SnapClean — Remove Backgrounds in 1 Click";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Dynamically generated OpenGraph image shown when the site is shared. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 50%, #4c1d95 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 40,
            fontWeight: 700,
            opacity: 0.9,
          }}
        >
          ✨ SnapClean
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 84,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          RemoveBackground in 1 Click
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 36,
            opacity: 0.75,
            textAlign: "center",
          }}
        >
          Free · Fast · 100% on your device
        </div>
      </div>
    ),
    { ...size }
  );
}