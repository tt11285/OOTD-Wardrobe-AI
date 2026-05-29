"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Singleton browser Supabase client for auth (magic link).
// Session is persisted to localStorage; magic-link tokens in the redirect URL
// are detected automatically. Returns null when env isn't configured, so the
// app gracefully falls back to the anonymous demo user.

let cached: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    cached = null;
    return null;
  }

  cached = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}
