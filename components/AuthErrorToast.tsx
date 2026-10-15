"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Surfaces auth failures that arrive as query params (e.g. the callback route
 * bouncing back to /login?error=auth) so the user is never left on the login
 * screen with no explanation.
 */
export function AuthErrorToast() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  useEffect(() => {
    if (!error) return;
    toast.error(
      errorDescription ||
        (error === "auth"
          ? "We couldn't complete sign-in. Please try again."
          : error)
    );
  }, [error, errorDescription]);

  return null;
}
