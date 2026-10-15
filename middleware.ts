import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request so server components
 * always see an up-to-date user, and gates the authenticated /dashboard routes.
 *
 * Public routes: /, /login, /signup, /auth/callback. Everything except
 * /dashboard is left reachable without a session.
 */
export async function middleware(request: NextRequest) {
  // NEVER touch the auth session on the OAuth/PKCE callback route. Calling
  // getUser() here with a stale/expired session cookie triggers a failed token
  // refresh, which tears the session down and DELETES the PKCE code-verifier
  // cookie before the callback route can exchange the code for a session.
  // That produced "pkce_code_verifier_not_found" and left users stuck on the
  // login screen. Let the route handler own this request untouched.
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without configuration there is nothing to refresh — skip gracefully.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        headers: Record<string, string>
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        // CDN / proxy cache-control headers for responses that set auth cookies.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        );
      },
    },
  });

  // IMPORTANT: use getUser() (never getSession()) so the token is validated
  // and refreshed against Supabase on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate authenticated-only routes. Unauthenticated visitors are bounced to
  // the login page with a `next` param so they land where they intended.
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;

    const redirectResponse = NextResponse.redirect(loginUrl);
    // Preserve any refreshed auth cookies on the redirect.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    response.headers.forEach((value, key) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
