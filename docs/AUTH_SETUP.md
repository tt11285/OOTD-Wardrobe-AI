# Auth Setup (Supabase Magic Link)

OOTD uses passwordless **email magic-link** sign-in. The code is ready; this doc
is the one-time dashboard config + test steps.

> When signed out, the app runs in anonymous `demo-user` mode (fully usable).
> Auth is additive.

---

## 1. Supabase dashboard config (~3 min)

Your project's `NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY` are set in
`.env.local` — no code changes needed.

### 1.1 Open the project
1. Go to https://supabase.com/dashboard and sign in.
2. Open your project.

### 1.2 Enable email sign-in
1. Left sidebar → **Authentication** (shield icon).
2. **Sign In / Providers** (older UI: **Providers**) → open **Email**.
3. Make sure **Enable Email provider** is on.
4. **Confirm email** can stay at its default (doesn't affect magic links).
5. **Save** if you changed anything.

### 1.3 Set redirect URLs (important)
1. **Authentication → URL Configuration**.
2. **Site URL**: `http://localhost:3000`.
3. **Redirect URLs**: **Add URL** → `http://localhost:3000` (optionally also the
   wildcard `http://localhost:3000/**`).
4. **Save**.

> The login flow redirects back to the current origin. Supabase only allows
> whitelisted addresses, otherwise you get `redirect not allowed`.
> After deploying, add your production domain (e.g. `https://your-app.vercel.app`)
> to both Site URL and Redirect URLs.

---

## 2. Test sign-in (~1 min)

Prereq: `npm run dev` is running (`http://localhost:3000`).

1. Open `http://localhost:3000/login` (desktop top-right **Sign in** / mobile bottom **ACCOUNT**).
2. Enter a real email → **Send magic link**.
3. Check your inbox (sender: Supabase; **check spam if it's missing**).
4. **Open the link in the same browser** → you return to the home page with your
   email shown top-right = signed in.
5. While signed in, your wardrobe/outfits belong to your account (empty at first,
   separate from the demo data — that's expected).
6. Sign out: `/login` → **Sign out**.

---

## 3. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `redirect ... not allowed` | Step 1.3 isn't done — add `http://localhost:3000` to Redirect URLs and Save |
| No email arrives | Free-tier email is rate-limited (a few per hour) and lands in spam; wait, check spam, avoid rapid retries |
| Link returns but not signed in | Open the link in the **same browser**; don't open a desktop-issued link on a phone |
| "Auth isn't configured" | `.env.local` is missing `NEXT_PUBLIC_SUPABASE_*`; add them and **restart the dev server** |

---

## 4. How it works

- Browser uses the `@supabase/supabase-js` client; the session lives in
  localStorage and the magic-link token is auto-detected (PKCE, `detectSessionInUrl`).
- Client requests attach the access token via `authedFetch`; API routes verify it
  with `getRequestUserId` and key data on the verified `user.id`.
- **Lightweight isolation**: no database RLS. For production-grade isolation, add
  RLS policies per table (future work).
