// Calls Gemini 2.5 Flash Image ("Nano Banana") to extract a clothing item
// from a photo: removes background / hangers / mannequins / hands, places the
// garment on a clean white surface, and intelligently reconstructs folded or
// out-of-frame parts so the whole item is visible.
//
// Returns a new base64 data URL on success, or `null` on any failure (timeout,
// API error, no image in response). Callers should fall back to the original
// image when this returns `null`.
//
// Env vars:
//   GEMINI_API_KEY / GOOGLE_API_KEY  — required, Google AI Studio key
//   OOTD_IMAGE_EDIT_MODEL            — optional, default "gemini-2.5-flash-image-preview"
//   OOTD_GEMINI_BASE_URL             — optional, default Google's generativelanguage endpoint

const DEFAULT_MODEL = "gemini-2.5-flash-image";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 18_000;

const EXTRACTION_PROMPT = [
  "Task: Extract the clothing item from this photo for a digital wardrobe catalog.",
  "",
  "Requirements:",
  "1. Remove the entire background — including hangers, hooks, mannequins, hands, body, floor, walls.",
  "2. Place the garment on a clean PURE WHITE background (#FFFFFF), centered with comfortable margins.",
  "3. If the garment is folded, scrunched, hidden behind another object, or partially out of frame, intelligently reconstruct the missing parts so the ENTIRE item is visible — laid flat or in 'ghost mannequin' style, as if displayed in a product catalog.",
  "4. Preserve color, pattern, fabric texture, prints, buttons, zippers, and stitching ACCURATELY. Do NOT change the garment design or invent details that are not implied by what is visible.",
  "5. Output a single, clean product photo of the clothing item only. No text, no annotations, no watermarks.",
  "",
  "If the photo contains multiple separate garments, focus on the most prominent / largest one and ignore the rest.",
  "If there is NO clothing visible in the photo, return the image unchanged.",
].join("\n");

type GeminiInlineData = {
  mimeType?: string;
  mime_type?: string;
  data?: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  promptFeedback?: unknown;
  error?: { message?: string };
};

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const colonIdx = dataUrl.indexOf(",");
  if (colonIdx < 0) return null;
  const header = dataUrl.slice(0, colonIdx);
  const data = dataUrl.slice(colonIdx + 1);
  const m = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/);
  if (!m || !data) return null;
  return { mimeType: m[1], data };
}

/**
 * Extract a single clothing item from a photo. Returns a new image data URL,
 * or `null` if the API is unavailable, fails, or returns no image.
 */
export async function extractClothingImage(dataUrl: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("[gemini-image] No GEMINI_API_KEY / GOOGLE_API_KEY set — skipping extraction");
    return null;
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    console.warn("[gemini-image] Input is not a base64 data URL — skipping extraction");
    return null;
  }

  // Sanity-check: don't burn quota on placeholder images.
  if (parsed.data.length < 500) {
    console.warn("[gemini-image] Input image looks like a placeholder (<500 b64 chars) — skipping");
    return null;
  }

  const model = process.env.OOTD_IMAGE_EDIT_MODEL || DEFAULT_MODEL;
  const baseUrl = process.env.OOTD_GEMINI_BASE_URL || DEFAULT_BASE_URL;
  const url = `${baseUrl}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: EXTRACTION_PROMPT },
              { inline_data: { mime_type: parsed.mimeType, data: parsed.data } },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          temperature: 0.15,
        },
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gemini-image] fetch failed after ${Date.now() - startedAt}ms:`, msg);
    return null;
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    console.error(`[gemini-image] HTTP ${response.status} after ${Date.now() - startedAt}ms: ${errBody.slice(0, 400)}`);
    return null;
  }

  let payload: GeminiResponse;
  try {
    payload = (await response.json()) as GeminiResponse;
  } catch (err) {
    console.error("[gemini-image] Failed to parse JSON response:", err instanceof Error ? err.message : err);
    return null;
  }

  if (payload.error?.message) {
    console.error("[gemini-image] API error:", payload.error.message);
    return null;
  }

  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const blob = part.inlineData ?? part.inline_data;
    const data = blob?.data;
    if (data && data.length > 500) {
      const outMime = blob?.mimeType ?? blob?.mime_type ?? "image/png";
      console.log(
        `[gemini-image] ✅ Extracted in ${Date.now() - startedAt}ms (${data.length} b64 chars, ${outMime})`,
      );
      return `data:${outMime};base64,${data}`;
    }
  }

  const finishReason = payload.candidates?.[0]?.finishReason;
  console.warn(
    `[gemini-image] Response had no image data (finishReason=${finishReason ?? "?"}) after ${Date.now() - startedAt}ms`,
  );
  return null;
}

/**
 * Batch helper: run extraction across many input URLs in parallel and return a
 * Map keyed by the ORIGINAL data URL. Missing/failed entries map to `null`.
 */
export async function extractMany(dataUrls: string[]): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    dataUrls.map(async (url) => [url, await extractClothingImage(url)] as const),
  );
  return new Map(entries);
}
