import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { todayKey } from "@/lib/profile";

export const dynamic = "force-dynamic";

// Seed used so the landing counter looks alive before real traffic arrives.
const BASE_COUNT = 1240;

/**
 * GET /api/count — number of photos processed today (approximate global total).
 * Falls back to a seeded number if the database is unreachable/unconfigured.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const startOfDay = `${todayKey()}T00:00:00.000Z`;

    const { count, error } = await admin
      .from("images")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay);

    if (error) throw error;

    return NextResponse.json({ count: BASE_COUNT + (count ?? 0) });
  } catch (err) {
    console.error("count GET fallback", err);
    // Deterministic-ish jitter so the number still changes between loads.
    return NextResponse.json({
      count: BASE_COUNT + Math.floor(Math.random() * 50),
    });
  }
}