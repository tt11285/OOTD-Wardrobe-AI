// Seeds a realistic demo wardrobe for `demo-user`.
//
// For each item it asks Gemini (gemini-2.5-flash-image) for a clean product
// photo on white, uploads it to Supabase Storage, and inserts the row. If image
// generation fails for an item, it falls back to a solid-color PNG swatch so the
// seed always completes.
//
// Usage:  NODE_USE_ENV_PROXY=1 node scripts/seed-demo-wardrobe.mjs
// Re-running is safe — it clears existing demo-user items first.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

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

const USER_ID = "demo-user";
const BUCKET = "wardrobe-images";
const GEMINI_KEY = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
const IMAGE_MODEL = env.OOTD_IMAGE_EDIT_MODEL || "gemini-2.5-flash-image";

// ─── Solid-color PNG fallback ─────────────────────────────────────────────────
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function makeSolidColorPng(width, height, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = rgb[0];
    row[1 + x * 3 + 1] = rgb[1];
    row[1 + x * 3 + 2] = rgb[2];
  }
  const raw = Buffer.alloc(height * row.length);
  for (let y = 0; y < height; y++) row.copy(raw, y * row.length);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// ─── Gemini product-photo generation ─────────────────────────────────────────
async function generateProductPhoto(description) {
  if (!GEMINI_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
  const prompt = [
    `Generate a clean e-commerce product photo of ${description}.`,
    "Lay it flat or ghost-mannequin style, centered on a pure white background (#FFFFFF).",
    "Soft even studio lighting, photorealistic, the garment fills most of the frame.",
    "No text, no logos, no watermark, no human, no props.",
  ].join(" ");
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(40000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.4 },
      }),
    });
    if (!res.ok) {
      console.log(`      ⚠️  gen HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const blob = p.inlineData ?? p.inline_data;
      if (blob?.data && blob.data.length > 1000) {
        const mime = blob.mimeType ?? blob.mime_type ?? "image/png";
        return { buffer: Buffer.from(blob.data, "base64"), mime };
      }
    }
    return null;
  } catch (e) {
    console.log(`      ⚠️  gen failed: ${e.message}`);
    return null;
  }
}

// ─── Demo wardrobe (richer, covers every category with multiples) ─────────────
const demoItems = [
  { name: "白色棉质衬衫",   category: "top",       colors: ["白色"], style_tags: ["通勤", "简约"], formality: 3, rgb: [245, 245, 240], desc: "a crisp white cotton button-up shirt" },
  { name: "米白针织开衫",   category: "top",       colors: ["米白"], style_tags: ["法式", "柔和"], formality: 3, rgb: [232, 223, 206], desc: "a cream knit cardigan" },
  { name: "浅蓝条纹衬衫",   category: "top",       colors: ["浅蓝"], style_tags: ["清爽", "通勤"], formality: 3, rgb: [200, 215, 232], desc: "a light blue and white striped cotton shirt" },
  { name: "黑色高领针织",   category: "top",       colors: ["黑色"], style_tags: ["利落", "简约"], formality: 3, rgb: [30, 30, 33],   desc: "a black fine-knit turtleneck sweater" },
  { name: "藏蓝直筒牛仔裤", category: "bottom",    colors: ["藏蓝"], style_tags: ["休闲", "百搭"], formality: 2, rgb: [53, 68, 107],  desc: "dark navy straight-leg denim jeans" },
  { name: "黑色直筒西裤",   category: "bottom",    colors: ["黑色"], style_tags: ["利落", "正式"], formality: 4, rgb: [28, 28, 31],   desc: "black tailored straight-leg trousers" },
  { name: "米白阔腿裤",     category: "bottom",    colors: ["米白"], style_tags: ["显高", "法式"], formality: 3, rgb: [233, 226, 212], desc: "off-white high-waisted wide-leg trousers" },
  { name: "驼色及膝半裙",   category: "bottom",    colors: ["驼色"], style_tags: ["柔和", "通勤"], formality: 3, rgb: [184, 161, 126], desc: "a camel A-line knee-length skirt" },
  { name: "棕色乐福鞋",     category: "shoes",     colors: ["棕色"], style_tags: ["复古", "精致"], formality: 3, rgb: [123, 91, 63],  desc: "brown leather penny loafers" },
  { name: "白色小白鞋",     category: "shoes",     colors: ["白色"], style_tags: ["休闲", "干净"], formality: 2, rgb: [240, 240, 238], desc: "clean white minimalist leather sneakers" },
  { name: "黑色踝靴",       category: "shoes",     colors: ["黑色"], style_tags: ["利落", "百搭"], formality: 3, rgb: [32, 32, 35],   desc: "black leather ankle boots" },
  { name: "驼色风衣",       category: "outer",     colors: ["驼色"], style_tags: ["法式", "通勤"], formality: 3, rgb: [184, 161, 126], desc: "a classic camel trench coat" },
  { name: "藏蓝西装外套",   category: "outer",     colors: ["藏蓝"], style_tags: ["干练", "正式"], formality: 4, rgb: [40, 52, 82],   desc: "a navy tailored blazer" },
  { name: "棕色皮质腰带",   category: "accessory", colors: ["棕色"], style_tags: ["精致", "点缀"], formality: 3, rgb: [110, 78, 52],  desc: "a brown leather belt" },
];

// ─── 1. Clean existing demo-user data ────────────────────────────────────────
console.log("🗑️  Cleaning existing demo-user data...");
await client.from("clothing_items").delete().eq("user_id", USER_ID);
await client.from("recognition_results").delete().eq("user_id", USER_ID);
await client.from("outfit_candidates").delete().eq("user_id", USER_ID);
const { data: existingFiles } = await client.storage.from(BUCKET).list(USER_ID);
if (existingFiles?.length) {
  await client.storage.from(BUCKET).remove(existingFiles.map((f) => `${USER_ID}/${f.name}`));
  console.log(`   🧹 Removed ${existingFiles.length} old storage files`);
}

// ─── 2. Generate/upload image + insert row for each item ─────────────────────
console.log(`\n📦 Seeding ${demoItems.length} items (AI photo → swatch fallback)…`);
let aiCount = 0;
for (const item of demoItems) {
  const id = crypto.randomUUID();

  let buffer;
  let ext;
  let mime;
  const gen = await generateProductPhoto(item.desc);
  if (gen) {
    buffer = gen.buffer;
    mime = gen.mime;
    ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    aiCount++;
  } else {
    buffer = makeSolidColorPng(256, 256, item.rgb);
    mime = "image/png";
    ext = "png";
  }

  const path = `${USER_ID}/${id}.${ext}`;
  const { error: uploadErr } = await client.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: true });
  if (uploadErr) {
    console.log(`   ❌ Upload ${item.name}: ${uploadErr.message}`);
    continue;
  }

  const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(path);
  const { error: insertErr } = await client.from("clothing_items").insert({
    id,
    user_id: USER_ID,
    image_url: publicUrl,
    category: item.category,
    name: item.name,
    colors: item.colors,
    style_tags: item.style_tags,
    season: ["春", "秋"],
    formality: item.formality,
    confidence: 0.95,
    manually_edited: false,
  });

  console.log(insertErr ? `   ❌ Insert ${item.name}: ${insertErr.message}` : `   ✅ ${item.name} (${gen ? "AI photo" : "swatch"}, ${buffer.length}b)`);
}

console.log(`\n✨ Done. ${aiCount}/${demoItems.length} real AI photos. Refresh http://localhost:3000/wardrobe`);
