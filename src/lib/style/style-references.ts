// ─── Aesthetic knowledge base (RAG corpus) ────────────────────────────────────
// A curated set of styling cases. Each `description` is embedded (Gemini
// text-embedding-004) and the closest cases to the user's occasion are injected
// into the outfit-recommendation prompt as reference cases.
//
// Text-only on purpose — no scraped images — to avoid copyright issues. This is
// the V0 knowledge base; the PRD's pgvector path is the scale option for 200+.
//
// Source of truth is `style-references.json` (so the seed script and the app
// share the same data). Embeddings are baked into `style-references.embedded.json`
// by `scripts/embed-style-references.mjs`.

import raw from "./style-references.json";

export type StyleReference = {
  id: string;
  title: string;
  description: string;
  styleCategory: string;
  occasionTags: string[];
  colorPalette: string[];
};

export type EmbeddedStyleReference = StyleReference & {
  embedding: number[];
};

export const styleReferences: StyleReference[] = raw as StyleReference[];
