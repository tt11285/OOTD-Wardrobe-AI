"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export const DEMO_USER_ID = "demo-user";

// Legacy helper — kept for the anonymous fallback path.
export function getAnonymousUserId(): string {
  return DEMO_USER_ID;
}

export type AuthState = {
  /** The id to key data on: the signed-in user's id, or the demo user. */
  userId: string;
  /** The signed-in user's email, if any. */
  email: string | null;
  /** True once the initial auth check has resolved. */
  ready: boolean;
  /** True when a real session exists (not the anonymous demo user). */
  signedIn: boolean;
};

// Reactive auth state. Falls back to the demo user when Supabase auth isn't
// configured or no one is signed in — so the app always works.
export function useAuth(): AuthState {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>(DEMO_USER_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? DEMO_USER_ID);
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? DEMO_USER_ID);
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, email, ready, signedIn: userId !== DEMO_USER_ID };
}
