"use client";

import Script from "next/script";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
}

/**
 * Google AdSense placeholder.
 * The ad is only rendered when NEXT_PUBLIC_ADSENSE_CLIENT_ID is configured,
 * so the placeholder is a no-op by default and hidden from Pro users by the
 * parent component.
 */
export function AdBanner({
  slot,
  format = "auto",
  className,
  showAds = false,
}: AdBannerProps & { showAds?: boolean }) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  if (!clientId || !showAds) {
    return (
      <div
        aria-hidden
        className={`flex min-h-[90px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground ${className ?? ""}`}
      >
        <span className="text-[10px] uppercase tracking-widest">Advertisement</span>
        <span className="opacity-60">Ad space</span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[90px] w-full justify-center overflow-hidden ${className ?? ""}`}
    >
      <Script
        async
        crossOrigin="anonymous"
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      />
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `try{(adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}`,
        }}
      />
    </div>
  );
}