# OOTD Wardrobe AI

48h MVP for an AI-native wardrobe and outfit recommendation app.

## What Works Now

- Responsive home / upload / wardrobe / outfits pages — desktop top nav,
  mobile bottom nav; UI copy in English.
- Two-column landing page with iPhone mockups of the Add → Wardrobe → Outfits flow.
- Upload 1-10 clothing photos with magic-byte format detection (rejects HEIC).
- Real recognition (Claude via Ofox) + background removal / edge reconstruction
  (Gemini 2.5 Flash Image), run in parallel; deterministic demo fallback when no keys.
- Confidence tiers: auto-accept (≥0.85) / review queue (0.60–0.84) / retake (<0.60).
- Manual edit of clothing attributes — in the review queue **and** in the wardrobe.
- Occasion input with quick tags.
- **RAG aesthetic knowledge base**: occasion query embedded (Gemini) → cosine
  retrieval over a curated style corpus → injected into the recommendation prompt.
- Magazine-style swipeable outfit results with collage, "why this look" detail, accept.
- **Magic-link auth** (optional): signed-in users get their own wardrobe; anonymous
  demo mode otherwise. See [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md).

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

## Demo Script

1. Open `/upload`, select a few clothing photos (JPG/PNG/WebP).
2. Watch AI recognition + cutout; high-confidence items auto-add, others go to the review queue (editable).
3. Open `/wardrobe` — items appear; tap the pencil to edit any attribute.
4. Open `/outfits`, pick an occasion (e.g. `Interview`), Generate looks.
5. Swipe the result cards, expand "Why this look", tap `Wear this today`.

To seed demo data without uploading: `node scripts/seed-demo-wardrobe.mjs`.

## Verification

Current verification commands:

```bash
npm test
npm run lint
npm run build
```
