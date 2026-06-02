// Generates Dressy's avatar — a polished fashion-stylist portrait — via Gemini
// and uploads it to Supabase Storage at wardrobe-images/dressy/avatar.png.
//
// Usage:  NODE_USE_ENV_PROXY=1 node scripts/generate-dressy-avatar.mjs

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

const PROMPT = [
  "A polished head-and-shoulders portrait of a confident, stylish young woman who is a professional fashion stylist.",
  "She has a chic modern haircut, fresh radiant complexion, a warm self-assured smile, and excellent upright posture.",
  "She wears an elegant, fashion-forward top (a crisp blazer or tailored knit) in soft neutral tones — cream, camel, black.",
  "Soft studio lighting, clean warm cream background, photorealistic editorial fashion-magazine quality.",
  "Centered, facing the camera, looking directly at the viewer. Approachable, trustworthy, stylish, full of energy.",
  "One person only. No text, no logos, no watermark.",
].join(" ");

async function generate() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.6 },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
const buf = await generate();
const path = "dressy/avatar.png";
const { error } = await client.storage.from(BUCKET).upload(path, buf, { contentType: "image/png", upsert: true });
if (error) {
  console.error("❌ upload failed:", error.message);
  process.exit(1);
}
const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(path);
console.log(`✨ Dressy avatar uploaded (${buf.length}b)\n   ${publicUrl}`);
