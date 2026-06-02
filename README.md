# OOTD — meet Dressy, your AI stylist

> A full closet, and nothing to wear? **OOTD** turns a pile of clothing photos
> into a smart digital wardrobe, then **Dressy** — your AI stylist — puts together
> ready-to-wear, full-body outfit looks for any occasion, and refines them as you chat.

See the full writeup in [docs/HACKATHON_SUBMISSION.md](docs/HACKATHON_SUBMISSION.md).

## What works now

- **Snap → Dressy learns.** Upload 1–10 clothing photos (magic-byte format guard,
  rejects HEIC). Claude recognizes the main garment (category, color, material,
  style) while Gemini removes the background — run in parallel. You confirm/edit
  each item (name, category, brand, material, color/style/season chips) before it
  enters the wardrobe.
- **Digital wardrobe.** Gallery grouped by category, with in-place edit and delete.
- **Ask → Dressy styles.** Pick an occasion and Dressy generates 2–3 cohesive looks
  **from your real wardrobe**, each shown as a **full-body model wearing the outfit**,
  with a "top pick", an editorial reason, and hover-to-enlarge on each piece.
- **Aspirational mode.** When the wardrobe can't meet the occasion, she still
  guarantees one wearable look plus inspiration looks that flag pieces you don't own.
- **Chat → Dressy refines.** A draggable chat avatar lets you say "more casual",
  "swap the shoes", etc.; she replies in her own voice and restyles the looks live
  (with freshly generated full-body images).
- **RAG aesthetic knowledge base.** Occasion query embedded (Gemini) → cosine
  retrieval over a curated style corpus → grounds the stylist's reasoning.
- **Share card.** Export an editorial OOTD card (PNG) for any look.
- **Magic-link auth** (optional, additive): signed-in users get their own wardrobe;
  anonymous demo mode otherwise. See [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md).
- Responsive throughout — desktop top nav, mobile bottom nav; UI copy in English,
  AI-generated content also in English.
- **Runs fully in demo mode without any API keys** — recognition and outfits fall
  back to deterministic sample data, and the seeded demo wardrobe shows when logged out.

## Local Setup

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

Copy `.env.example` to `.env.local` when external services are ready.

```bash
cp .env.example .env.local
```

Required for real Supabase persistence:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional for real AI integration:

```text
OOTD_RECOGNITION_PROVIDER=ofox-anthropic   # enable real Claude recognition + outfits
OFOX_API_KEY=                              # Ofox Anthropic proxy key
OOTD_RECOGNITION_MODEL=
OOTD_RECOMMENDATION_MODEL=
GEMINI_API_KEY=                            # image extraction + RAG embeddings
OOTD_EMBEDDING_MODEL=gemini-embedding-001  # optional override
```

The app runs without these using deterministic demo fallback data.

### Authentication

Magic-link login is optional and additive — see **[docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)**
for the one-time Supabase dashboard config and test steps.

### RAG knowledge base

Style cases live in `src/lib/style/style-references.json`. After editing them,
re-bake the embeddings:

```bash
NODE_USE_ENV_PROXY=1 node scripts/embed-style-references.mjs
```

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor when the project is created.
Apply incremental schema changes from **[docs/DB_MIGRATIONS.md](docs/DB_MIGRATIONS.md)**.

## Demo Script

> For the prebuilt demo wardrobe + full-body looks, **stay logged out** (anonymous
> demo user). Seed it with `node scripts/seed-demo-wardrobe.mjs` and look images with
> `NODE_USE_ENV_PROXY=1 node scripts/generate-look-images.mjs` (proxy only needed
> locally behind a firewall).

1. Landing page → meet **Dressy**, your stylist.
2. `/upload` — select clothing photos (JPG/PNG/WebP); each recognized item lands in
   a **Review & confirm** card you edit, then **Confirm**.
3. `/wardrobe` — items grouped by category; tap the pencil to edit, or delete.
4. `/outfits` — pick an occasion (e.g. `Interview`) → Generate → swipe the full-body
   looks, hover a piece to enlarge, expand "Why this look", tap `Wear this today`.
5. Tap the floating **Ask Dressy** avatar → "make it more casual" → she restyles live.

## Deploy (Vercel)

1. Import the GitHub repo at [vercel.com](https://vercel.com) (framework auto-detected as Next.js).
2. Add the environment variables from `.env.example` (copy the values from your
   `.env.local`). Without the Supabase vars the app still runs in demo mode.
3. Deploy. After it's live, add your Vercel URL to Supabase → Authentication →
   URL Configuration (Site URL + Redirect URLs) so magic-link login can return.

The `build` script is plain `next build` (no local proxy), so it builds cleanly on Vercel.

## Verification

```bash
npm test       # 31 unit tests
npm run lint   # eslint
npm run build  # production build
```
