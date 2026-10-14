import type { Metadata } from "next";
import Link from "next/link";
import { Github, Mail, Twitter } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the SnapClean team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container max-w-2xl px-4 py-12 md:py-20">
      <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
      <p className="mt-2 text-muted-foreground">
        Questions, feedback or partnership ideas? We&apos;d love to hear from
        you.
      </p>

      <div className="mt-8 space-y-4">
        <a
          href="mailto:support@snapclean.app"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">Email</p>
            <p className="text-sm text-muted-foreground">
              support@snapclean.app
            </p>
          </div>
        </a>

        <div className="flex gap-4">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
          >
            <Twitter className="h-5 w-5" />
            <span className="text-sm font-medium">Twitter</span>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
          >
            <Github className="h-5 w-5" />
            <span className="text-sm font-medium">GitHub</span>
          </a>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border bg-muted/30 p-6">
        <h2 className="font-semibold">Ready to get started?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Remove your first background in seconds — no account required.
        </p>
        <Button asChild className="mt-4">
          <Link href="/editor">Open the editor</Link>
        </Button>
      </div>
    </div>
  );
}