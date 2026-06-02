// Pre-generates a full-body model image for each curated demo look and uploads
// it to Supabase Storage at wardrobe-images/looks/{occasion}-{i}.png.
//
// Usage:  NODE_USE_ENV_PROXY=1 node scripts/generate-look-images.mjs
// Re-running overwrites existing look images (upsert).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "..", ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BUCKET = "wardrobe-images";
const KEY = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
const MODEL = env.OOTD_IMAGE_EDIT_MODEL || "gemini-2.5-flash-image";

// Mirror of the curated looks (occasion slug + ordered pieces). Keep in sync
// with src/lib/style/curated-outfits.ts.
const LOOKS = {
  commute: [
    "a crisp white cotton shirt, black tailored trousers, brown leather loafers, a camel trench coat",
    "a cream knit cardigan, off-white wide-leg trousers, white sneakers, a camel silk scarf",
    "a light blue striped shirt, black tailored trousers, a navy blazer, black ankle boots",
  ],
  date: [
    "an ivory silk blouse, a camel A-line midi skirt, black heeled pumps, gold hoop earrings",
    "a black turtleneck, navy straight jeans, black ankle boots, a camel trench coat",
    "a cream knit cardigan, off-white wide-leg trousers, black heeled pumps, a black leather tote",
  ],
  interview: [
    "a crisp white cotton shirt, black tailored trousers, a navy blazer, black ankle boots",
    "a light blue striped shirt, black tailored trousers, brown loafers, a brown leather belt",
    "an ivory silk blouse, off-white wide-leg trousers, a long black wool coat, black heeled pumps",
  ],
  casual: [
    "a crisp white cotton shirt, navy straight jeans, white sneakers, a brown leather belt",
    "a cream knit cardigan, navy straight jeans, white sneakers, a camel silk scarf",
    "a black turtleneck, off-white wide-leg trousers, white sneakers, a black leather tote",
  ],
  meeting: [
    "a crisp white cotton shirt, black tailored trousers, a navy blazer, black heeled pumps",
    "a black turtleneck, black tailored trousers, a long black wool coat, black ankle boots",
    "an ivory silk blouse, a camel A-line midi skirt, a navy blazer, brown loafers",
  ],
};

async function generate(pieces) {
  const prompt = [
    `Full-body editorial fashion photo of a single model wearing: ${pieces}.`,
    "Standing, head to toe fully visible, natural confident pose, looking at camera.",
    "Clean light studio background (soft warm grey/cream), soft daylight, photorealistic, magazine lookbook quality.",
    "The outfit must clearly show every listed garment. No text, no logos, no watermark, one person only.",
  ].join(" ");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.5 },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const blob = p.inlineData ?? p.inline_data;
    if (blob?.data && blob.data.length > 1000) return Buffer.from(blob.data, "base64");
  }
  throw new Error("no image in response");
}

if (!KEY) {
  console.error("❌ Missing GEMINI_API_KEY");
  process.exit(1);
}

await client.storage.createBucket(BUCKET, { public: true }).catch(() => {});
let ok = 0;
for (const [slug, looks] of Object.entries(LOOKS)) {
  for (let i = 0; i < looks.length; i++) {
    const path = `looks/${slug}-${i + 1}.png`;
    try {
      const buf = await generate(looks[i]);
      const { error } = await client.storage.from(BUCKET).upload(path, buf, { contentType: "image/png", upsert: true });
      if (error) throw new Error(error.message);
      console.log(`   ✅ ${path} (${buf.length}b)`);
      ok++;
    } catch (e) {
      console.log(`   ❌ ${path}: ${e.message}`);
    }
  }
}
console.log(`\n✨ Done. ${ok}/15 look images generated.`);
