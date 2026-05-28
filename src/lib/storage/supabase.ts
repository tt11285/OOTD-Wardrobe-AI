import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const STORAGE_BUCKET = "wardrobe-images";

/**
 * Upload a base64 data-URL image to Supabase Storage and return the public CDN URL.
 * Falls back to returning the original dataUrl if storage isn't available or upload fails.
 *
 * Images are stored at:  wardrobe-images/<userId>/<imageId>.<ext>
 *
 * The bucket must already exist and be set to public in the Supabase dashboard, OR
 * this function will attempt to create it automatically on first use.
 */
export async function uploadImageToStorage(
  dataUrl: string,
  userId: string,
  imageId: string,
): Promise<string> {
  const client = createSupabaseServerClient();

  if (!client) {
    // No Supabase configured – return base64 as-is (dev/test mode)
    return dataUrl;
  }

  // Split on the first comma – everything after is the base64 payload
  const colonIdx = dataUrl.indexOf(",");
  const headerPart = colonIdx >= 0 ? dataUrl.slice(0, colonIdx) : "";
  const base64Data = colonIdx >= 0 ? dataUrl.slice(colonIdx + 1) : "";
  const mimeMatch = headerPart.match(/^data:(image\/[a-zA-Z0-9.+\-]+);base64$/);
  const match = mimeMatch && base64Data ? [null, mimeMatch[1], base64Data] as const : null;

  if (!match) {
    console.error("[storage] Not a valid base64 data URL – skipping upload");
    return dataUrl;
  }

  const mimeType = match[1] as string;
  const b64Payload = match[2] as string;

  // Validate the image is not a tiny placeholder (< 200 bytes ≈ 267 base64 chars)
  if (b64Payload.length < 267) {
    console.warn("[storage] Image data appears to be a placeholder (< 200 bytes) – skipping upload");
    return dataUrl;
  }

  const ext = mimeType === "image/png" ? "png" : "jpg";
  const path = `${userId}/${imageId}.${ext}`;
  const buffer = Buffer.from(b64Payload, "base64");

  // Try to ensure the bucket exists (silently ignore "already exists" errors)
  await client.storage
    .createBucket(STORAGE_BUCKET, { public: true, fileSizeLimit: 10 * 1024 * 1024 })
    .catch(() => { /* bucket probably already exists */ });

  const { error: uploadError } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("[storage] Upload failed:", uploadError.message);
    // Fallback: store the compressed base64 directly in the DB column
    return dataUrl;
  }

  const {
    data: { publicUrl },
  } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  return publicUrl;
}
