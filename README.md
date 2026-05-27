# OOTD Wardrobe AI

48h MVP for an AI-native wardrobe and outfit recommendation app.

## What Works Now

- Mobile-first home, upload, wardrobe, and outfit pages.
- Upload UI for 1-10 clothing photos.
- Demo AI fallback recognition when no model API key is configured.
- Auto-accept high-confidence recognized clothing.
- Manual review path for lower-confidence items.
- Wardrobe grid with category filters.
- Occasion input with quick tags.
- Outfit generation from real wardrobe items.
- Accepting an outfit records the action.

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
OOTD_RECOGNITION_MODEL=
OOTD_RECOMMENDATION_MODEL=
OPENAI_API_KEY=
```

The app currently runs without these values using deterministic demo fallback data.

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor when the project is created.

## Demo Script

1. Open `/upload`.
2. Select several clothing photos.
3. Let the fallback recognizer create wardrobe items.
4. Open `/wardrobe` and confirm the items appear.
5. Open `/outfits`.
6. Choose `面试` or `通勤`.
7. Generate outfits.
8. Click `今天就穿这套`.

## Verification

Current verification commands:

```bash
npm test
npm run lint
npm run build
```
