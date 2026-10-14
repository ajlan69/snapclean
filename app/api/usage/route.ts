import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { todayKey } from "@/lib/profile";
import { FREE_DAILY_LIMIT } from "@/lib/usage";

export const dynamic = "force-dynamic";

/**
 * GET  /api/usage — return today's usage for the signed-in user.
 * POST /api/usage — increment today's usage and return the new value.
 *
 * Guests are tracked entirely in localStorage on the client; this endpoint is
 * only meaningful for authenticated users.
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("plan, daily_count, last_reset")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("usage GET error", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const isPro = profile?.plan === "pro";
  const used =
    profile?.last_reset === todayKey() ? profile?.daily_count ?? 0 : 0;

  return NextResponse.json({
    used,
    limit: isPro ? -1 : FREE_DAILY_LIMIT,
    plan: isPro ? "pro" : "free",
  });
}

export async function POST() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("plan, daily_count, last_reset")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("usage POST error", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Pro users are unlimited — no counter to update.
  if (profile?.plan === "pro") {
    return NextResponse.json({ used: 0, limit: -1, plan: "pro" });
  }

  const today = todayKey();
  const isNewDay = profile?.last_reset !== today;
  const nextCount = isNewDay ? 1 : (profile?.daily_count ?? 0) + 1;

  const { error: updateError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      daily_count: nextCount,
      last_reset: today,
    },
    { onConflict: "id" }
  );

  if (updateError) {
    console.error("usage POST update error", updateError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({
    used: nextCount,
    limit: FREE_DAILY_LIMIT,
    plan: "free",
  });
}