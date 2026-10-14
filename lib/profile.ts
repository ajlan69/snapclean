import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Plan } from "@/lib/types";

/** UTC date key (YYYY-MM-DD) used to detect daily counter resets. */
export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export interface CurrentProfile {
  userId: string | null;
  email: string | null;
  plan: Plan;
  used: number;
}

/**
 * Resolve the current user's plan and today's usage.
 * Anonymous visitors and users without a profile row default to Free.
 */
export async function getCurrentProfile(): Promise<CurrentProfile> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { userId: null, email: null, plan: "free", used: 0 };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("plan, daily_count, last_reset")
      .eq("id", user.id)
      .maybeSingle();

    const plan: Plan =
      profile?.plan === "pro" ? "pro" : "free";

    // A stale last_reset means the counter should read as zero for today.
    const used =
      profile?.last_reset === todayKey() ? profile?.daily_count ?? 0 : 0;

    return { userId: user.id, email: user.email ?? null, plan, used };
  } catch (err) {
    // Next.js throws a special error when a page that used `cookies()` is
    // evaluated during static generation. It must bubble up so Next can opt
    // the route into dynamic rendering instead of us swallowing it.
    if (isDynamicServerError(err)) throw err;
    console.error("getCurrentProfile failed", err);
    return { userId: null, email: null, plan: "free", used: 0 };
  }
}

/** Narrow check for Next.js's DYNAMIC_SERVER_USAGE sentinel error. */
function isDynamicServerError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}