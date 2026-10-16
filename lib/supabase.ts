import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Used in client components for auth actions, storage and realtime subscriptions.
 *
 * Env vars are read with static `process.env.NEXT_PUBLIC_*` access so Next.js
 * inlines them into the client bundle at build time, and are validated rather
 * than asserted with `!` so a missing value surfaces a clear error instead of a
 * cryptic "Your project's URL and API key are required" failure.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
