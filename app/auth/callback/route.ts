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

  const redirectBase = getRedirectBase(origin);

  if (!code) {
    if (oauthError) {
      console.error(
        `Callback OAuth error: ${oauthError}${
          oauthErrorDescription ? ` — ${oauthErrorDescription}` : ""
        }`
      );
    } else {
      console.error("Callback hit without a `code` parameter.");
    }
    return NextResponse.redirect(`${redirectBase}/login?error=auth`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Callback misconfigured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
    return NextResponse.redirect(`${redirectBase}/login?error=auth`);
  }

  try {
    console.log("Callback hit, exchanging code...");

    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Exchange error:", error);
      return NextResponse.redirect(`${redirectBase}/login?error=auth`);
    }

    return NextResponse.redirect(`${redirectBase}${next}`);
  } catch (err) {
    // Network/parse failures from exchangeCodeForSession throw rather than
    // returning an `error`; catch them so the route never 500s.
    console.error("Unhandled error during code exchange:", err);
    return NextResponse.redirect(`${redirectBase}/login?error=auth`);
  }
}

/**
 * Base URL for post-callback redirects. Prefer the origin the request actually
 * arrived on so the session cookie it just wrote is sent back to the same host;
 * fall back to the configured site URL if the origin looks unusable.
 */
function getRedirectBase(origin: string): string {
  try {
    const parsed = new URL(origin);
    if (parsed.hostname) return parsed.origin;
  } catch {
    // fall through
  }

  const configured =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    const trimmed = configured.replace(/\/+$/, "");
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
  }

  return origin;
}

/** Only allow same-site, path-only redirects (prevents open redirects). */
function sanitizeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}
