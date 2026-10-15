"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

/**
 * Subscribe to the current Supabase auth user.
 * Returns `null` while loading so callers can show placeholders.
 */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    console.log("[useUser] subscribing to onAuthStateChange");

    supabase.auth.getUser().then(({ data, error }) => {
      console.log("[useUser] initial getUser", {
        userId: data.user?.id ?? null,
        error,
      });
      if (error) console.error("[useUser] initial getUser error", error);
      setUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[useUser] onAuthStateChange", {
        event,
        userId: session?.user?.id ?? null,
      });
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}

export type UserState = ReturnType<typeof useUser>;