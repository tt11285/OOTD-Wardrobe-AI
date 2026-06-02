import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "@/lib/ai/embeddings";
import { rankStyleReferencesByKeyword, formatReferencesForPrompt } from "@/lib/style/retrieve";
import { styleReferences, type EmbeddedStyleReference } from "@/lib/style/style-references";
import embedded from "@/lib/style/style-references.embedded.json";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("is -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 5);
  });

  it("is 0 when a vector is all zeros", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("keyword retrieval (fallback path)", () => {
  it("ranks an interview case first for an interview occasion", () => {
    const top = rankStyleReferencesByKeyword("interview tomorrow", 4);
    expect(top.length).toBe(4);
    expect(top[0].occasionTags).toContain("interview");
  });

  it("matches by occasion keyword", () => {
    const top = rankStyleReferencesByKeyword("commute", 3);
    expect(top.length).toBe(3);
    expect(top.some((r) => r.occasionTags.includes("commute"))).toBe(true);
  });

  it("still returns k cases when nothing matches (principle backfill)", () => {
    const top = rankStyleReferencesByKeyword("zzzz-nonsense", 4);
    expect(top.length).toBe(4);
  });
});

describe("formatReferencesForPrompt", () => {
  it("returns empty string for no references", () => {
    expect(formatReferencesForPrompt([])).toBe("");
  });

  it("numbers and labels each case", () => {
    const text = formatReferencesForPrompt(styleReferences.slice(0, 2));
    expect(text).toMatch(/^1\. 【/);
    expect(text.split("\n")).toHaveLength(2);
  });
});

describe("embedded corpus integrity", () => {
  const corpus = embedded as EmbeddedStyleReference[];

  it("has a baked embedding for every source case", () => {
    expect(corpus.length).toBe(styleReferences.length);
  });

  it("uses a consistent 768-dim embedding", () => {
    expect(corpus.every((c) => Array.isArray(c.embedding) && c.embedding.length === 768)).toBe(true);
  });

  it("has unique ids", () => {
    const ids = new Set(corpus.map((c) => c.id));
    expect(ids.size).toBe(corpus.length);
  });
});
