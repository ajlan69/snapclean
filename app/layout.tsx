import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Toaster } from "sonner";

import { getAppBaseUrl, getMetadataBase } from "@/lib/app-url";

const appUrl = getAppBaseUrl();

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "SnapClean — Remove Backgrounds in 1 Click",
    template: "%s · SnapClean",
  },
  description:
    "Remove image backgrounds and enhance photos in one click. 100% client-side, free to try, no upload to any server.",
  keywords: [
    "background remover",
    "remove background",
    "photo enhancer",
    "transparent png",
    "ai background remover",
    "snapclean",
  ],
  authors: [{ name: "SnapClean" }],
  openGraph: {
    type: "website",
    url: appUrl,
    title: "SnapClean — Remove Backgrounds in 1 Click",
    description:
      "Free, fast, private background removal that runs entirely in your browser. No server uploads.",
    siteName: "SnapClean",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapClean — Remove Backgrounds in 1 Click",
    description:
      "Free, fast, private background removal that runs entirely in your browser.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "gUPv3oq7XG4YTkh6qIosfBw9XXyRdipO8U9q922R3Xk",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster richColors position="top-center" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}