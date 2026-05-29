// RAG retrieval over the style-reference corpus.
//
// Primary path: embed the occasion query (Gemini) → cosine similarity against
// the pre-embedded corpus → top-K cases.
// Fallback path (no key / embed fails / no corpus): keyword overlap on
// occasionTags + title, so the prompt is still enriched. Never throws.

import { embedText, cosineSimilarity } from "@/lib/ai/embeddings";
import type { EmbeddedStyleReference, StyleReference } from "@/lib/style/style-references";
import { styleReferences } from "@/lib/style/style-references";
import embeddedRaw from "@/lib/style/style-references.embedded.json";

const embedded = embeddedRaw as EmbeddedStyleReference[];

function keywordMatch(occasion: string, k: number): StyleReference[] {
  const q = occasion.trim().toLowerCase();
  const scored = styleReferences.map((ref) => {
    let score = 0;
    for (const tag of ref.occasionTags) {
      const t = tag.toLowerCase();
      if (q.includes(t) || t.includes(q)) score += 2;
    }
    if (ref.title.toLowerCase().includes(q)) score += 1;
    return { ref, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // Always return k cases — generic principles backfill when nothing matches.
  return scored.slice(0, k).map((s) => s.ref);
}

export async function retrieveStyleReferences(occasion: string, k = 4): Promise<StyleReference[]> {
  if (!occasion.trim()) return [];

  // Semantic retrieval when the corpus is embedded and the query embeds OK.
  if (embedded.length && embedded[0]?.embedding?.length) {
    const queryVec = await embedText(occasion);
    if (queryVec) {
      const ranked = embedded
        .map((ref) => ({ ref, score: cosineSimilarity(queryVec, ref.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(({ ref }) => {
          // Strip the embedding before returning — callers only need the text.
          const { embedding: _embedding, ...rest } = ref;
          void _embedding;
          return rest as StyleReference;
        });
      if (ranked.length) return ranked;
    }
  }

  // Fallback: keyword overlap.
  return keywordMatch(occasion, k);
}

export function formatReferencesForPrompt(refs: StyleReference[]): string {
  if (!refs.length) return "";
  return refs
    .map((ref, i) => `${i + 1}. 【${ref.styleCategory}】${ref.title}：${ref.description}`)
    .join("\n");
}
