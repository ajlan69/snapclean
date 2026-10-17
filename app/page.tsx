import type { Metadata } from "next";
import { ShieldCheck, Zap, Lock } from "lucide-react";

import { HeroUpload } from "@/components/HeroUpload";
import { DemoSection } from "@/components/DemoSection";
import { FeatureGrid } from "@/components/FeatureGrid";
import { PricingTable } from "@/components/PricingTable";
import { getCurrentProfile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "SnapClean — Remove Background in 1 Click",
  description:
    "Free, fast, private background remover. Remove image backgrounds and enhance photos in one click — right in your browser.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // The current plan drives the pricing CTA.
  const { plan } = await getCurrentProfile();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"
        />
        <div className="container flex flex-col items-center px-4 py-16 text-center md:py-24">
          <span className="rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            No sign-up required · 100% on-device
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Remove Background in{" "}
            <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
              1 Click
            </span>{" "}
            — Free, Fast
          </h1>
          <p className="mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg">
            No upload to server. Your photos never leave your device. Cut out
            subjects and enhance them in seconds.
          </p>

          <div className="mt-8 w-full max-w-xl">
            <HeroUpload />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4" /> Private by design
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> 10 free images/day
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" /> Instant downloads
            </span>
          </div>
        </div>
      </section>

      {/* Demo */}
      <DemoSection />

      {/* Features */}
      <section className="container px-4 py-16 md:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to make photos pop
          </h2>
          <p className="mt-3 text-muted-foreground">
            A complete, privacy-first photo studio that runs right in your
            browser.
          </p>
        </div>
        <FeatureGrid />
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/20 py-16 md:py-24">
        <div className="container px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start free today — join the waitlist for unlimited, full-resolution
              HD exports.
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <PricingTable currentPlan={plan} />
          </div>
        </div>
      </section>
    </>
  );
}