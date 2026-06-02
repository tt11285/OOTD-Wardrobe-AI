# OOTD — Hackathon Submission

> **Tagline:** A full closet, and nothing to wear? Meet **Dressy** — the AI stylist who memorises your wardrobe and tells you what to wear.

---

## 1. One-liner

**OOTD** turns a pile of clothing photos into a smart digital wardrobe, then **Dressy**, your AI stylist, puts together ready-to-wear, full-body outfit looks for any occasion — and you can chat with her to refine them.

## 2. The problem

People stand in front of a full closet and still feel they have "nothing to wear." Existing wardrobe apps make you hand-tag every item, and generic outfit inspiration is from clothes you don't own. Decision fatigue, low wardrobe utilisation, and zero personalised styling.

## 3. The solution

An **AI-native styling assistant** built around one persona — **Dressy**:

1. **Snap → Dressy learns.** Upload clothing photos; AI recognises each piece (category, color, material, style) and cuts it out onto a clean background. You confirm/edit, then it's in your wardrobe.
2. **Ask → Dressy styles.** Tell her the occasion ("interview", "date", "black-tie gala") and she generates 2-3 cohesive looks **from your real wardrobe**, each shown as a **full-body model wearing the outfit**, with a "top pick" and an editorial reason.
3. **Chat → Dressy refines.** A draggable chat avatar lets you say "more casual", "swap the shoes", "no jacket" — she replies in her own voice and **re-styles the looks live**, generating fresh full-body images.
4. **Aspirational mode.** When your wardrobe can't meet the occasion, she still guarantees one wearable look from your closet, plus inspiration looks that mark suggested pieces you don't own yet.

## 4. Key features

- **Bulk wardrobe onboarding** — up to 10 photos/batch, magic-byte format guard (rejects HEIC), AI recognition + background-removal in parallel, confidence-tiered review & confirm flow, full attribute editing (name, category, brand, material, color/style/season chips).
- **Occasion-based outfit generation** — wardrobe-first, always ≥1 wearable look; aspirational looks when needed; one AI "top pick".
- **Full-body lookbook** — each outfit rendered as a model wearing it; hover any piece to enlarge the product image.
- **Conversational restyling** — chat with Dressy to refine looks; re-styled looks get freshly generated full-body images.
- **RAG aesthetic knowledge base** — 38-case curated style corpus embedded (Gemini), retrieved by occasion to ground the stylist's reasoning.
- **Editorial UI** — "Editorial Atelier" design system (warm cream, Playfair serif, terracotta), magazine-grade lookbook, gallery wardrobe, share-card export, skeleton/shimmer loading, tasteful motion (reduced-motion friendly).
- **Auth & persistence** — magic-link sign-in (optional, additive); per-user wardrobe; anonymous demo mode otherwise.

## 5. Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Custom CSS design system (no UI kit) |
| Recognition + Styling LLM | Claude (Sonnet) via Ofox Anthropic proxy |
| Image gen / cutout | Google **Gemini 2.5 Flash Image** (background removal, full-body looks, avatar) |
| Embeddings (RAG) | Gemini `gemini-embedding-001` (768-dim, cosine in-memory) |
| Data / storage / auth | Supabase (Postgres + Storage + Auth) |
| Deploy target | Vercel |

**Architecture highlights**
- Model Router pattern — no hard-coded model versions, env-var driven, graceful demo fallbacks everywhere (the app fully works without any API key).
- Parallel pipelines — recognition (Claude) + cutout (Gemini) run together.
- RAG without a vector DB — embeddings baked to JSON, cosine at runtime (pgvector is the scale path).
- One image = one main garment; cutout matched to recognition.

## 6. AI usage (where intelligence lives)

- **Vision recognition** of garments → structured attributes.
- **Background removal + edge reconstruction** to catalog-quality product shots.
- **Full-body look synthesis** — a model wearing the chosen pieces.
- **RAG-grounded outfit reasoning** — occasion → retrieved aesthetic cases → curated, explained looks.
- **Conversational stylist** — multi-turn chat that revises outfits with the user's real items.

## 7. Demo script (90 seconds)

1. Open the landing page → "A full closet, and nothing to wear?" + meet **Dressy**.
2. **Wardrobe** (logged out = demo): 20 real garments grouped by category.
3. **Outfits** → pick **Interview** → Generate → 3 full-body looks, ★ Top pick, hover a piece to enlarge.
4. Try **Meeting** with a thin wardrobe → see one wearable look + aspirational "styling goal" looks with suggested pieces.
5. Tap the floating **Ask Dressy** avatar → "more casual" → she replies and the looks restyle live (with new full-body images).
6. **Share this look** → editorial OOTD card → download PNG.

> To run the demo with the prebuilt wardrobe, stay logged out (anonymous demo user). Seed data: `node scripts/seed-demo-wardrobe.mjs`, looks: `scripts/generate-look-images.mjs`.

## 8. Status & metrics

- 47 TS/TSX source files, ~5k lines; 39 commits.
- 31 unit tests passing; `tsc` + `eslint` clean; production build passes.
- 5 occasions × 3 curated, image-backed demo looks; 20-item demo wardrobe.

## 9. What's next

- Real-time full-body generation for every custom occasion (currently prebaked + on-demand for chat).
- pgvector at scale for a larger aesthetic library.
- Wear-history calendar, share-to-social, and a native app.

## 10. Run it locally

```bash
npm install
npm run dev   # http://localhost:3000
```

Env (optional — app runs in demo mode without them): see `.env.example`.
Auth setup: [docs/AUTH_SETUP.md](AUTH_SETUP.md). DB migrations: [docs/DB_MIGRATIONS.md](DB_MIGRATIONS.md).
