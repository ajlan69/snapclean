import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of SnapClean.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="container max-w-3xl px-4 py-12 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {new Date().getFullYear()}
      </p>

      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
        <h2 className="mt-8 text-xl font-semibold">Acceptance</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          By using SnapClean you agree to these terms. If you do not agree,
          please do not use the service.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Your content</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You retain all rights to the images you process. You are responsible
          for ensuring you have the right to edit and use any image you upload.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Subscriptions</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pro is billed at $9 per month and renews automatically until
          cancelled. You can cancel any time from the customer portal.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Acceptable use</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Do not use SnapClean to process unlawful content or to infringe the
          rights of others.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Disclaimer</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          SnapClean is provided &ldquo;as is&rdquo; without warranties of any
          kind. We are not liable for any damages arising from use of the
          service.
        </p>
      </div>
    </div>
  );
}