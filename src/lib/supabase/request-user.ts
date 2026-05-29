import { createClient } from "@supabase/supabase-js";

// Resolve the user id for an API request. If a valid Supabase access token is
// present (Authorization: Bearer …), verify it and use the authenticated user's
// id. Otherwise fall back to the caller-supplied id (anonymous demo mode).
//
// This is the "lightweight" isolation model: data is keyed on the verified
// user.id, without database-level RLS.
export async function getRequestUserId(request: Request, fallbackUserId: string): Promise<string> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (token && url && key) {
    try {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) return data.user.id;
    } catch {
      /* fall through to anonymous fallback */
    }
  }

  return fallbackUserId;
}
