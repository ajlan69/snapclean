import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Wand2 } from "lucide-react";

import { AuthForm } from "@/components/AuthForm";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to SnapClean with a passwordless magic link.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage() {
  // Already signed in? Skip straight to the dashboard.
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
          <h1 className="mt-4 text-xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to SnapClean to access your dashboard.
          </p>
        </div>

        <Suspense fallback={null}>
          <AuthForm mode="login" />
        </Suspense>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to SnapClean?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}