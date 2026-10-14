import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Reject unexpectedly large preview payloads (data URLs) to protect the DB.
const MAX_PREVIEW_LENGTH = 400_000; // ~400KB per image

interface ImagePayload {
  original_url?: string;
  processed_url?: string;
}

/**
 * POST /api/images — save a lightweight preview pair to the user's history.
 * Full-resolution images are never uploaded; only small thumbnails are stored.
 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ImagePayload;
  try {
    payload = (await request.json()) as ImagePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { original_url = "", processed_url = "" } = payload;

  if (original_url.length > MAX_PREVIEW_LENGTH || processed_url.length > MAX_PREVIEW_LENGTH) {
    return NextResponse.json({ error: "Preview too large" }, { status: 413 });
  }

  const { data, error } = await supabase
    .from("images")
    .insert({
      user_id: user.id,
      original_url,
      processed_url,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("images POST error", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ image: data }, { status: 201 });
}
