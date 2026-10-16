"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.8 4.4-5.35 4.4-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.56-2.5C16.7 3.9 14.55 3 12 3 6.98 3 3 7.02 3 12s3.98 9 9 9c5.2 0 8.64-3.65 8.64-8.79 0-.59-.06-1.04-.29-1.11Z" />
    </svg>
  );
}

/**
 * Delegates authentication to Google via Supabase OAuth. The provider
 * redirects back to /auth/callback, which exchanges the code for a session.
 */
export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      const supabase = createClient();

      // window.location.origin is the correct choice in production: the OAuth
      // redirect must return to the exact host the user is browsing, otherwise
      // the PKCE verifier cookie (written by this browser) won't be found.
      // NEXT_PUBLIC_SITE_URL is only a fallback for non-browser environments.
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

      const redirectTo = `${origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;

      // On success Supabase redirects the full page to Google. If `data.url`
      // is missing the redirect never happens, so surface it.
      if (!data?.url) {
        throw new Error("Google sign-in did not return a redirect URL.");
      }
    } catch (err) {
      console.error("[GoogleSignIn] sign-in failed", err);
      toast.error(
        err instanceof Error ? err.message : "Couldn't sign in with Google."
      );
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleSignIn}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="h-4 w-4" />
      )}
      Sign in with Google
    </Button>
  );
}
