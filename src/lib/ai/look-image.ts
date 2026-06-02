// Generates a full-body model image for an outfit (used for chat-restyled
// looks that have no pre-baked image). Best-effort: returns a public Supabase
// URL on success, or null on any failure so the UI falls back to the collage.

import { createSupabaseServerClient } from "@/lib/storage/supabase";

const DEFAULT_MODEL = "gemini-2.5-flash-image";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const BUCKET = "wardrobe-images";
const TIMEOUT_MS = 45_000;

type PieceLite = { name: string; category: string };

export async function generateLookImage(pieces: PieceLite[], lookId: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || pieces.length < 2) return null;

  const model = process.env.OOTD_IMAGE_EDIT_MODEL || DEFAULT_MODEL;
  const garments = pieces.map((p) => p.name).join(", ");
  const prompt = [
    `Full-body editorial fashion photo of a single model wearing: ${garments}.`,
    "Standing, head to toe fully visible, natural confident pose, looking at camera.",
    "Clean light studio background (soft warm grey/cream), soft daylight, photorealistic, magazine lookbook quality.",
    "The outfit must clearly show every listed garment. No text, no logos, no watermark, one person only.",
  ].join(" ");

  let buffer: Buffer;
  try {
    const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.5 },
      }),
    });
    if (!res.ok) {
      console.error(`[look-image] HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string }; inline_data?: { data?: string } }> } }>;
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    let b64: string | undefined;
    for (const p of parts) {
      const d = p.inlineData?.data ?? p.inline_data?.data;
      if (d && d.length > 1000) {
        b64 = d;
        break;
      }
    }
    if (!b64) return null;
    buffer = Buffer.from(b64, "base64");
  } catch (err) {
    console.error("[look-image] generate failed:", err instanceof Error ? err.message : err);
    return null;
  }

  const client = createSupabaseServerClient();
  if (!client) {
    // No storage — return an inline data URL as a fallback (still renders).
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }

  const path = `looks/chat-${lookId}.png`;
  const { error } = await client.storage.from(BUCKET).upload(path, buffer, { contentType: "image/png", upsert: true });
  if (error) {
    console.error("[look-image] upload failed:", error.message);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }
  const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}
