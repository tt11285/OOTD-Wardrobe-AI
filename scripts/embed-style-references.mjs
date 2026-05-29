// Bakes Gemini embeddings into the style-reference corpus.
//
// Reads  src/lib/style/style-references.json
// Writes src/lib/style/style-references.embedded.json  (cases + embedding[])
//
// Run with:  NODE_USE_ENV_PROXY=1 node scripts/embed-style-references.mjs
// Requires GEMINI_API_KEY in .env.local and (behind GFW) HTTP_PROXY exported.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* no .env.local — rely on real env */
  }
}
loadEnv();

const MODEL = process.env.OOTD_EMBEDDING_MODEL || "gemini-embedding-001";
const DIM = 768; // must match runtime query embedding in src/lib/ai/embeddings.ts
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

async function embed(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: DIM,
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || !values.length) throw new Error("no embedding values");
  return values;
}

const srcPath = join(ROOT, "src/lib/style/style-references.json");
const outPath = join(ROOT, "src/lib/style/style-references.embedded.json");
const cases = JSON.parse(readFileSync(srcPath, "utf8"));

console.log(`🧠 Embedding ${cases.length} style references with ${MODEL}…`);

const embedded = [];
for (const c of cases) {
  // Embed title + description together for a richer signal.
  const values = await embed(`${c.title}。${c.description}`);
  embedded.push({ ...c, embedding: values });
  console.log(`   ✅ ${c.id} (${values.length}d)`);
}

writeFileSync(outPath, JSON.stringify(embedded, null, 2) + "\n", "utf8");
console.log(`✨ Wrote ${embedded.length} embedded references → ${outPath}`);
console.log(`   embedding dim: ${embedded[0].embedding.length}`);
