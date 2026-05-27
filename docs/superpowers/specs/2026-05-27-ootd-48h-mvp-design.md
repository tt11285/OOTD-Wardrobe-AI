# OOTD 48h MVP Design Spec

## Goal

Build a mobile-first web MVP that demonstrates the core OOTD loop within 48 hours:

Upload wardrobe photos -> AI recognizes clothing -> user reviews/edits items -> user enters an occasion -> AI recommends 2-3 outfits from the real wardrobe -> user accepts one outfit.

This is a hackathon MVP, not the full V0.1 Beta from `PRD.md`.

## Product Scope

### Must Ship

- Mobile-first responsive app with the core screens: home, upload, recognition review, wardrobe grid, occasion input, outfit results, mock paywall.
- Upload 1-10 photos per batch.
- Store uploaded images and recognized clothing items.
- Recognize clothing attributes with a multimodal LLM:
  - `name`
  - `category`: `top`, `bottom`, `outer`, `shoes`, `accessory`
  - `colors`
  - `style_tags`
  - `season`
  - `formality`: 1-5
  - `confidence`: 0-1
- Simplified progressive review:
  - `confidence >= 0.85`: auto-accepted into wardrobe
  - `confidence < 0.85`: requires review before wardrobe entry
- Manual item editing for AI correction.
- Wardrobe grid with item category filters.
- Occasion input with five quick tags:通勤, 约会, 面试, 休闲, 重要会议, plus free text.
- Outfit generation only when the wardrobe contains at least one top, one bottom, and one pair of shoes.
- Outfit generation returns 2-3 outfit candidates, each referencing only real clothing item IDs.
- Outfit result cards show item images, a short reason, style label, and color logic.
- "今天就穿这套" marks an outfit as accepted and writes a usage event.

### Defer Past 48h

- Full OnboardingSession pause/resume.
- Attribute-similarity duplicate detection.
- pgvector/RAG style reference search.
- Full Supabase Auth account system.
- Real Stripe or domestic payment.
- Real usage-limit enforcement.
- Outfit history calendar.
- Share card generation.
- Weather API and location.

## Architecture

Use a focused Next.js app with server-side AI calls and a small persistence layer.

- Frontend: Next.js App Router, React, Tailwind CSS, shadcn-style components, Zustand for lightweight client state.
- Backend: Next.js Route Handlers under `src/app/api`.
- Storage: Supabase Storage for uploaded images.
- Database: Supabase Postgres for wardrobe items, recognition results, outfit candidates, and usage events.
- AI: a model router wrapper that reads model names from environment variables and exposes two behaviors: `recognizeClothing` and `generateOutfits`.
- Style intelligence: a local `styleRules.ts` file containing the first-pass color, formality, occasion, and style rules. This replaces RAG for the 48h MVP.

## Data Model

### clothing_items

- `id`: uuid
- `user_id`: text
- `image_url`: text
- `category`: text
- `name`: text
- `colors`: text[]
- `style_tags`: text[]
- `season`: text[]
- `formality`: int
- `confidence`: numeric
- `manually_edited`: boolean
- `created_at`: timestamp
- `updated_at`: timestamp

### recognition_results

- `id`: uuid
- `user_id`: text
- `image_url`: text
- `raw_output`: jsonb
- `confidence`: numeric
- `status`: `auto_accepted`, `needs_review`, `failed`
- `final_item_id`: uuid nullable
- `created_at`: timestamp

### outfit_candidates

- `id`: uuid
- `user_id`: text
- `occasion`: text
- `selected_items`: uuid[]
- `reason`: text
- `style`: text
- `color_logic`: text
- `user_action`: `pending`, `accepted`, `rejected`
- `rank`: int
- `model_used`: text
- `created_at`: timestamp

### usage_events

- `id`: uuid
- `user_id`: text
- `event_name`: text
- `metadata`: jsonb
- `created_at`: timestamp

For the hackathon build, `user_id` may be a generated anonymous browser ID. Full auth is deferred.

## Core Flow

1. User lands on home and sees the wardrobe status.
2. User uploads 1-10 clothing photos.
3. API stores images and asks the recognition model for structured JSON.
4. High-confidence items are inserted into `clothing_items`.
5. Lower-confidence items are shown in the review queue.
6. User confirms or edits reviewed items.
7. User opens "今天穿什么", chooses a quick occasion tag or enters custom text.
8. API checks wardrobe readiness.
9. If the wardrobe is incomplete, UI asks user to add missing categories.
10. If ready, API generates 2-3 outfits using real item IDs and local style rules.
11. User reviews outfit cards and accepts one.
12. App records `outfit_accepted`.

## Error Handling

- Upload errors show a retry action and keep already-uploaded files.
- AI JSON parse errors return a friendly failed recognition card instead of crashing.
- Empty/no-clothing images create a failed recognition result with retake guidance.
- Outfit generation refuses to run when the wardrobe lacks top, bottom, or shoes.
- AI recommendations are validated server-side; any outfit referencing unknown item IDs is discarded before returning to the client.

## Testing

Use TDD for pure logic first:

- Category readiness check.
- Confidence-tier assignment.
- Outfit validation rejects unknown item IDs.
- Occasion quick tag maps to expected formality hints.
- Style rules produce deterministic prompt context.

Then add integration-level checks for:

- Recognition API response normalization.
- Outfit API rejects incomplete wardrobe.
- Outfit API accepts a valid wardrobe and stores candidates.

Manual verification must include one full mobile viewport run:

- Upload images.
- Edit one item.
- Generate outfits for "面试".
- Accept one outfit.

## 48h Milestones

- 0-2h: project scaffold, env template, DB schema draft.
- 2-6h: mobile UI shell and navigation.
- 6-12h: upload pipeline and storage.
- 12-20h: recognition route, schema normalization, review state.
- 20-25h: review/edit UI and wardrobe grid.
- 25-32h: outfit generation route and prompt.
- 32-37h: outfit result UI and acceptance event.
- 37-41h: mock paywall, loading/error/empty states.
- 41-45h: mobile polish and real-photo testing.
- 45-48h: deploy, demo script, fallback seed data.

## Acceptance Criteria

- A user can upload at least 5 real clothing photos.
- The app can create at least 8 wardrobe items.
- The user can correct at least one AI recognition result.
- The user can generate 2-3 outfits for an occasion.
- All recommended outfit items exist in the user's wardrobe.
- The user can accept one outfit.
- The app runs on mobile and desktop without broken layout.
