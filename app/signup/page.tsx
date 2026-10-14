import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Wand2 } from "lucide-react";

import { AuthForm } from "@/components/AuthForm";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a free SnapClean account with a passwordless magic link.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="container flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Wand2 className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Free forever. Join the Pro waitlist any time.
          </p>
        </div>

        <GoogleSignInButton />

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Suspense fallback={null}>
          <AuthForm mode="signup" />
        </Suspense>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}