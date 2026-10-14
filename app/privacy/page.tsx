import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How SnapClean handles your data — spoiler: your images never leave your device.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl px-4 py-12 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {new Date().getFullYear()}
      </p>

      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
        <h2 className="mt-8 text-xl font-semibold">Client-side processing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          SnapClean removes and edits image backgrounds entirely in your
          browser. Your photos are never uploaded to our servers for processing.
          Once you close the tab, the working copy is gone.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Account data</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          If you create an account we store your email address, your plan and a
          small preview thumbnail of images you choose to keep in your history.
          We never store full-resolution originals.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Payments</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Payments are processed by Stripe. We never see or store your card
          details.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Advertising</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Free accounts may see ads served by Google AdSense. Pro accounts are
          ad-free.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Contact</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions? Reach us via the contact page.
        </p>
      </div>
    </div>
  );
}