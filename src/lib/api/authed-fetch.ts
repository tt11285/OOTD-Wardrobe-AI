"use client";

import { getBrowserSupabase } from "@/lib/supabase/browser";

// fetch wrapper that attaches the Supabase access token (when signed in) so the
// server can verify the session. Falls back to a plain fetch otherwise.
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = getBrowserSupabase();
  let token: string | undefined;

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  }

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
