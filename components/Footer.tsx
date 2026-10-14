import Link from "next/link";
import { Wand2 } from "lucide-react";

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t bg-background py-12">
      <div className="container grid gap-8 md:grid-cols-3">
        <div>
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wand2 className="h-4 w-4" />
            </span>
            SnapClean
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Remove backgrounds and enhance photos entirely in your browser.
            Your images never leave your device.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Company</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Legal</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/terms"
                className="transition-colors hover:text-foreground"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="transition-colors hover:text-foreground"
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} SnapClean. All rights reserved.</p>
        <p>Made with care — background removal runs 100% on your device.</p>
      </div>
    </footer>
  );
}