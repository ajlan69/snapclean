import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * OAuth / magic-link callback. Supabase redirects here with a `code` query
 * parameter which we exchange for a session. The @supabase/ssr client writes
 * the resulting session cookies onto the response via the cookie store.
 *
 * NOTE: middleware.ts deliberately skips this route — running getUser() here
 * with a stale session cookie would tear the session down and delete the PKCE
 * code-verifier cookie before we can exchange it.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  // Supabase forwards provider/flow failures here instead of a `code`.
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (code) {
    console.log("Callback hit, exchanging code...");
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Called from a Server Component — safe to ignore when middleware
              // is responsible for refreshing the session.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Exchange error:", error);
  } else if (oauthError) {
    console.error(
      `Callback OAuth error: ${oauthError}${
        oauthErrorDescription ? ` — ${oauthErrorDescription}` : ""
      }`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

/** Only allow same-site, path-only redirects (prevents open redirects). */
function sanitizeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}
