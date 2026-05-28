// Seeds 6 demo wardrobe items with REAL 256×256 solid-color PNGs uploaded to
// Supabase Storage. Re-running is safe — it deletes existing demo-user items
// first.
//
// Usage:  node scripts/seed-demo-wardrobe.mjs

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

// ─── PNG encoder for solid-color 256×256 image ───────────────────────────────
// PNG file format: signature + IHDR chunk + IDAT chunk + IEND chunk
// Each chunk = length(4) + type(4) + data + crc32(4)
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
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

function makeSolidColorPng(width, height, rgb /* [r,g,b] */) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width, height, bit depth=8, color type=2 (RGB), compression=0, filter=0, interlace=0
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // IDAT: one filter byte (0) + width*3 RGB bytes per row, then zlib-compressed
  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0; // no filter
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = rgb[0];
    row[1 + x * 3 + 1] = rgb[1];
    row[1 + x * 3 + 2] = rgb[2];
  }
  const raw = Buffer.alloc(height * row.length);
  for (let y = 0; y < height; y++) {
    row.copy(raw, y * row.length);
  }
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ─── Demo wardrobe definition ────────────────────────────────────────────────
const demoItems = [
  { name: "白色棉质衬衫",  category: "top",     colors: ["白色"],  style_tags: ["通勤", "简约"], formality: 3, rgb: [245, 245, 240] },
  { name: "米白针织开衫",  category: "top",     colors: ["米白"],  style_tags: ["法式", "柔和"], formality: 3, rgb: [232, 223, 206] },
  { name: "藏蓝牛仔裤",    category: "bottom",  colors: ["藏蓝"],  style_tags: ["休闲", "百搭"], formality: 2, rgb: [53, 68, 107] },
  { name: "黑色直筒西裤",  category: "bottom",  colors: ["黑色"],  style_tags: ["利落", "正式"], formality: 4, rgb: [28, 28, 31] },
  { name: "棕色乐福鞋",    category: "shoes",   colors: ["棕色"],  style_tags: ["复古", "精致"], formality: 3, rgb: [123, 91, 63] },
  { name: "驼色风衣",      category: "outer",   colors: ["驼色"],  style_tags: ["法式", "通勤"], formality: 3, rgb: [184, 161, 126] },
];

// ─── 1. Clean existing demo-user data ────────────────────────────────────────
console.log("🗑️  Cleaning existing demo-user items...");
await client.from("clothing_items").delete().eq("user_id", USER_ID);
await client.from("recognition_results").delete().eq("user_id", USER_ID);
await client.from("outfit_candidates").delete().eq("user_id", USER_ID);

// Also remove existing files from storage so we don't accumulate junk
const { data: existingFiles } = await client.storage.from(BUCKET).list(USER_ID);
if (existingFiles?.length) {
  const paths = existingFiles.map((f) => `${USER_ID}/${f.name}`);
  await client.storage.from(BUCKET).remove(paths);
  console.log(`   🧹 Removed ${paths.length} old storage files`);
}

// ─── 2. Upload PNG + insert row for each item ────────────────────────────────
console.log(`\n📦 Seeding ${demoItems.length} demo items with 256×256 PNGs...`);
for (const item of demoItems) {
  const id = crypto.randomUUID();
  const path = `${USER_ID}/${id}.png`;
  const pngBuf = makeSolidColorPng(256, 256, item.rgb);

  const { error: uploadErr } = await client.storage
    .from(BUCKET)
    .upload(path, pngBuf, { contentType: "image/png", upsert: true });

  if (uploadErr) {
    console.log(`   ❌ Upload ${item.name}: ${uploadErr.message}`);
    continue;
  }

  const {
    data: { publicUrl },
  } = client.storage.from(BUCKET).getPublicUrl(path);

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

  if (insertErr) {
    console.log(`   ❌ Insert ${item.name}: ${insertErr.message}`);
  } else {
    console.log(`   ✅ ${item.name} (${pngBuf.length} bytes PNG, rgb=${item.rgb.join(",")})`);
  }
}

// ─── 3. Verify via CDN ───────────────────────────────────────────────────────
console.log("\n🧪 Verifying CDN delivery...");
const { data: final } = await client
  .from("clothing_items")
  .select("name, image_url")
  .eq("user_id", USER_ID)
  .limit(1);

if (final?.[0]) {
  const resp = await fetch(final[0].image_url);
  const buf = await resp.arrayBuffer();
  // PNG signature check
  const sig = Buffer.from(buf.slice(0, 8));
  const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
  console.log(`   ${final[0].name}: HTTP ${resp.status}, ${buf.byteLength} bytes, valid PNG=${isPng}`);
}

console.log("\n✨ Done. Now refresh http://localhost:3000/wardrobe");
