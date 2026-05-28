// One-shot maintenance script:
//   1. Lists current clothing_items
//   2. Deletes items whose image_url is a 1×1 placeholder (length < 300 chars
//      and not a real http(s) URL) — those are the broken legacy rows.
//   3. Ensures the "wardrobe-images" Storage bucket exists and is public.
//   4. Performs a tiny round-trip upload to confirm Storage actually works.
//
// Usage:  node scripts/cleanup-and-bootstrap.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

// minimal .env loader (no extra deps)
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STORAGE_BUCKET = "wardrobe-images";

// ─── 1. Inspect current items ────────────────────────────────────────────────
console.log("📋 Step 1: Inspecting current clothing_items...");
const { data: items, error: listErr } = await client
  .from("clothing_items")
  .select("id, name, image_url, user_id")
  .order("created_at", { ascending: false });

if (listErr) {
  console.error("❌ Failed to list items:", listErr.message);
  process.exit(1);
}

console.log(`   Found ${items.length} items total`);
for (const item of items) {
  const url = item.image_url || "";
  const tag = url.startsWith("http")
    ? "✅ Storage URL"
    : url.startsWith("data:") && url.length < 300
      ? "❌ broken placeholder"
      : url.startsWith("data:")
        ? "⚠️  base64 (large)"
        : "❓ unknown";
  console.log(`   - [${tag}] ${item.name} (user_id=${item.user_id}, url_len=${url.length})`);
}

// ─── 2. Delete broken placeholder items ──────────────────────────────────────
console.log("\n🗑️  Step 2: Deleting broken placeholder items...");
const broken = items.filter((it) => {
  const url = it.image_url || "";
  return url.startsWith("data:") && url.length < 300;
});

if (broken.length === 0) {
  console.log("   ✅ No broken placeholders to delete");
} else {
  for (const item of broken) {
    const { error } = await client.from("clothing_items").delete().eq("id", item.id);
    if (error) {
      console.log(`   ❌ Failed to delete ${item.name}: ${error.message}`);
    } else {
      console.log(`   🗑️  Deleted: ${item.name}`);
    }
  }
}

// Also clean any orphaned recognition_results
console.log("\n🗑️  Cleaning orphaned recognition_results...");
const { error: recogErr, count } = await client
  .from("recognition_results")
  .delete({ count: "exact" })
  .is("final_item_id", null);
if (recogErr) {
  console.log(`   ⚠️  ${recogErr.message}`);
} else {
  console.log(`   ✅ Removed ${count ?? 0} orphaned recognition rows`);
}

// ─── 3. Ensure Storage bucket exists ─────────────────────────────────────────
console.log("\n📦 Step 3: Ensuring Storage bucket exists...");
const { data: buckets, error: bucketListErr } = await client.storage.listBuckets();
if (bucketListErr) {
  console.error("❌ Cannot list buckets:", bucketListErr.message);
  console.log("   This usually means the service role key isn't allowed to manage Storage.");
  console.log("   👉 Manually create bucket in Supabase Dashboard:");
  console.log("      Storage → New bucket → Name: wardrobe-images → Public ✅");
} else {
  const existing = buckets.find((b) => b.name === STORAGE_BUCKET);
  if (existing) {
    console.log(`   ✅ Bucket "${STORAGE_BUCKET}" already exists (public=${existing.public})`);
    if (!existing.public) {
      console.log("   ⚠️  Bucket is NOT public — updating...");
      const { error: updateErr } = await client.storage.updateBucket(STORAGE_BUCKET, { public: true });
      if (updateErr) console.log(`   ❌ ${updateErr.message}`);
      else console.log("   ✅ Now public");
    }
  } else {
    console.log(`   📦 Creating bucket "${STORAGE_BUCKET}"...`);
    const { error: createErr } = await client.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    });
    if (createErr) {
      console.log(`   ❌ Failed: ${createErr.message}`);
      console.log("   👉 Manually create bucket in Supabase Dashboard:");
      console.log("      Storage → New bucket → Name: wardrobe-images → Public ✅");
    } else {
      console.log("   ✅ Created");
    }
  }
}

// ─── 4. Round-trip upload test ───────────────────────────────────────────────
console.log("\n🧪 Step 4: Testing round-trip upload...");
// A 200-byte solid pink JPG (just to prove we can upload AND read back via CDN)
const tinyJpegBase64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGiEcFxgfGRQUHScdHyIjJSUlFhwpLCgkKyEkJSP/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpiP//Z";
const testBuf = Buffer.from(tinyJpegBase64, "base64");
const testPath = `_health/test-${Date.now()}.jpg`;
const { error: uploadErr } = await client.storage
  .from(STORAGE_BUCKET)
  .upload(testPath, testBuf, { contentType: "image/jpeg", upsert: true });

if (uploadErr) {
  console.log(`   ❌ Upload failed: ${uploadErr.message}`);
} else {
  const {
    data: { publicUrl },
  } = client.storage.from(STORAGE_BUCKET).getPublicUrl(testPath);
  console.log(`   ✅ Uploaded successfully`);
  console.log(`   🔗 Public URL: ${publicUrl}`);

  // Try fetching it
  const resp = await fetch(publicUrl);
  console.log(`   🌐 GET via CDN: HTTP ${resp.status} (${resp.headers.get("content-length")} bytes)`);

  // Clean up
  await client.storage.from(STORAGE_BUCKET).remove([testPath]);
  console.log("   🧹 Removed test file");
}

console.log("\n✨ Done.");
