// Text embeddings via Gemini (reuses the existing GEMINI_API_KEY — no new key).
// Used to embed the user's occasion query at recommendation time and compare it
// against the pre-embedded style-reference corpus (in-memory cosine RAG).
//
// Returns null on any failure so callers can gracefully fall back.

const DEFAULT_MODEL = "gemini-embedding-001";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 8_000;
const OUTPUT_DIM = 768; // must match the baked corpus (scripts/embed-style-references.mjs)

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const trimmed = text.trim();
  if (!apiKey || !trimmed) return null;

  const model = process.env.OOTD_EMBEDDING_MODEL || DEFAULT_MODEL;
  const url = `${BASE_URL}/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text: trimmed }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: OUTPUT_DIM,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[embeddings] HTTP ${response.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as { embedding?: { values?: number[] } };
    const values = data.embedding?.values;
    return Array.isArray(values) && values.length ? values : null;
  } catch (err) {
    console.error("[embeddings] request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
