import { confidenceTier, normalizeRecognitionItem } from "@/lib/domain/recognition";
import { occasionHint } from "@/lib/domain/occasion";
import { stylePromptContext } from "@/lib/style/style-rules";
import { retrieveStyleReferences, formatReferencesForPrompt } from "@/lib/style/retrieve";
import { createDemoItem, createId, nowIso, type OutfitCandidate, type RecognitionRecord, type StoredClothingItem } from "@/lib/storage/repository";

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicResponse = {
  content?: AnthropicTextBlock[];
};

type ImagePayload = {
  mediaType: string;
  data: string;
};

type OfoxRecognitionResult = {
  record: RecognitionRecord;
  item: StoredClothingItem;
  status: RecognitionRecord["status"];
};

export function parseDataUrlImage(dataUrl: string): ImagePayload {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Expected a base64 image data URL.");
  }

  return {
    mediaType: match[1],
    data: match[2],
  };
}

export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain a JSON object.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

export async function recognizeWithOfoxAnthropic(imageUrls: string[], userId: string): Promise<OfoxRecognitionResult[]> {
  const apiKey = process.env.OFOX_API_KEY;
  const url = process.env.OFOX_ANTHROPIC_MESSAGES_URL || "https://api.ofox.ai/anthropic/v1/messages";
  const model = process.env.OOTD_RECOGNITION_MODEL || "anthropic/claude-sonnet-4.5";

  if (!apiKey) {
    throw new Error("Missing OFOX_API_KEY.");
  }

  // Use allSettled so a single bad image (HEIC, corrupt, too large) doesn't
  // kill the entire batch — individual failures are returned as "failed" items.
  const settled = await Promise.allSettled(
    imageUrls.map((imageUrl) => recognizeSingleImage({ apiKey, url, model, imageUrl, userId })),
  );

  const results: OfoxRecognitionResult[] = [];
  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value);
    } else {
      // Recognition failed for this specific image — return a failed stub so the
      // caller can still display it in the UI with an error state.
      console.error(`[recognize] Image ${i + 1}/${imageUrls.length} failed:`, outcome.reason);
      const imageUrl = imageUrls[i];
      const item = createDemoItem({ userId, imageUrl, name: "Recognition failed", category: "top" });
      const record: RecognitionRecord = {
        id: createId(),
        userId,
        imageUrl,
        rawOutput: { error: String(outcome.reason) },
        confidence: 0,
        status: "failed",
        finalItemId: null,
        createdAt: nowIso(),
      };
      results.push({ record, item, status: "failed" });
    }
  }
  return results;
}

// Claude vision only supports these MIME types.
const CLAUDE_SUPPORTED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);

async function recognizeSingleImage({
  apiKey,
  url,
  model,
  imageUrl,
  userId,
}: {
  apiKey: string;
  url: string;
  model: string;
  imageUrl: string;
  userId: string;
}): Promise<OfoxRecognitionResult[]> {
  const image = parseDataUrlImage(imageUrl);

  // Guard: return a "failed" result for formats Claude can't process (e.g. HEIC)
  // instead of letting the API call crash the entire batch.
  if (!CLAUDE_SUPPORTED_MIME.has(image.mediaType.toLowerCase())) {
    console.warn(`[recognize] Unsupported image format "${image.mediaType}" — skipping API call, returning failed result`);
    const item = createDemoItem({ userId, imageUrl, name: "Unknown item", category: "top" });
    const record: RecognitionRecord = {
      id: createId(),
      userId,
      imageUrl,
      rawOutput: { error: "unsupported_format", format: image.mediaType },
      confidence: 0,
      status: "failed",
      finalItemId: null,
      createdAt: nowIso(),
    };
    return [{ record, item, status: "failed" }];
  }
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1600,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: recognitionInstruction(),
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.data,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ofox recognition failed: ${response.status} ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as AnthropicResponse;
  const text = payload.content?.find((block) => block.type === "text")?.text;

  if (!text) {
    throw new Error("Ofox response did not include text content.");
  }

  const parsed = extractJsonObject(text) as { items?: unknown[] };
  // One image = one garment. If the model still returns several, keep only the
  // single most prominent one (the first) so it matches the cutout.
  const rawItems = Array.isArray(parsed.items) && parsed.items.length ? parsed.items : [{}];
  const raw = rawItems[0];

  const normalized = normalizeRecognitionItem(raw as Record<string, unknown>);
  const status = confidenceTier(normalized.confidence);
  const item = createDemoItem({
    userId,
    imageUrl,
    name: normalized.name,
    brand: normalized.brand,
    material: normalized.material,
    category: normalized.category,
    colors: normalized.colors,
    styleTags: normalized.styleTags,
    season: normalized.season,
    formality: normalized.formality,
    confidence: normalized.confidence,
  });
  const record: RecognitionRecord = {
    id: createId(),
    userId,
    imageUrl,
    rawOutput: raw,
    confidence: normalized.confidence,
    status,
    finalItemId: null,
    createdAt: nowIso(),
  };

  return [{ record, item, status }];
}

function recognitionInstruction(): string {
  return [
    "You are a professional clothing recognition assistant. Identify ONLY the single most prominent garment in the image (the one taking up the most space). Ignore secondary items.",
    "Output JSON only — no explanation, no Markdown.",
    "The items array contains just that one garment. Format:",
    '{"items":[{"name":"White cotton shirt","category":"top","material":"cotton","colors":["white"],"style_tags":["commute","minimal"],"season":["spring","summer"],"formality":3,"confidence":0.9}]}',
    "category must be one of: top, bottom, outer, shoes, accessory.",
    "ALL text values (name, material, colors, style_tags, season) MUST be in English.",
    "material is a short English fabric guess (e.g. cotton, wool, denim, leather, knit, chiffon); empty string if unclear.",
    "Do NOT identify brand (the user fills brand in themselves).",
    "formality is an integer 1-5, 1=very casual, 5=very formal.",
    "confidence is a number 0-1. Lower it when unsure.",
    'If there is no garment in the image, output {"items":[]}.',
  ].join("\n");
}

// ─── Outfit generation via Claude ────────────────────────────────────────────

type RawOutfit = {
  selected_items?: unknown[];
  selectedItems?: unknown[];
  reason?: unknown;
  style?: unknown;
  color_logic?: unknown;
  colorLogic?: unknown;
};

/**
 * Generate 2-3 outfit recommendations from the user's actual wardrobe by calling
 * Claude via the Ofox proxy. Returns parsed, validated OutfitCandidate[] that
 * reference only real item IDs the user owns.
 *
 * If the AI call fails for any reason, the caller should handle the rejection.
 */
export async function recommendOutfitsWithOfoxAnthropic(
  items: StoredClothingItem[],
  occasion: string,
  userId: string,
): Promise<OutfitCandidate[]> {
  const apiKey = process.env.OFOX_API_KEY;
  const url = process.env.OFOX_ANTHROPIC_MESSAGES_URL || "https://api.ofox.ai/anthropic/v1/messages";
  const model = process.env.OOTD_RECOMMENDATION_MODEL || process.env.OOTD_RECOGNITION_MODEL || "anthropic/claude-sonnet-4.5";

  if (!apiKey) {
    throw new Error("Missing OFOX_API_KEY.");
  }

  const hint = occasionHint(occasion);
  const wardrobeSummary = items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    colors: item.colors,
    style_tags: item.styleTags,
    formality: item.formality,
  }));

  // RAG: pull the most relevant aesthetic cases for this occasion (best-effort).
  const references = await retrieveStyleReferences(occasion, 4);
  const referencesBlock = formatReferencesForPrompt(references);

  const userPrompt = [
    "You are a personal stylist with a French-minimal, urban-commute aesthetic.",
    stylePromptContext(hint),
    ...(referencesBlock
      ? ["", "[Reference cases recalled from the aesthetic knowledge base — for inspiration only, do not copy verbatim]", referencesBlock]
      : []),
    "",
    "Here is the user's REAL wardrobe (only reference these ids, do not invent any):",
    JSON.stringify(wardrobeSummary, null, 2),
    "",
    `Occasion: ${occasion}`,
    "",
    "Generate 2-3 outfits. Output STRICT JSON (no Markdown, no explanation), format:",
    '{"outfits":[{"selected_items":["id1","id2","id3"],"style":"French minimal","reason":"why this works, 2-3 sentences","color_logic":"color pairing rationale, 1-2 sentences"}]}',
    "",
    "Hard rules:",
    "- Each outfit includes at least 1 top, 1 bottom and 1 pair of shoes; outer and accessory optional.",
    "- No more than 3 main colors.",
    `- Keep formality close to ${hint.formality} (1=very casual, 5=very formal).`,
    "- Write everything (style, reason, color_logic) in ENGLISH, in a warm professional stylist voice — not bullet points.",
  ].join("\n");

  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0.4,
      messages: [{ role: "user", content: [{ type: "text", text: userPrompt }] }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Ofox outfit generation failed: ${response.status} ${errBody.slice(0, 300)}`);
  }

  const payload = (await response.json()) as AnthropicResponse;
  const text = payload.content?.find((b) => b.type === "text")?.text;

  if (!text) {
    throw new Error("Ofox outfit response did not include text content.");
  }

  const parsed = extractJsonObject(text) as { outfits?: RawOutfit[] };
  const rawOutfits = Array.isArray(parsed.outfits) ? parsed.outfits : [];
  const knownIds = new Set(items.map((it) => it.id));
  const modelLabel = model;
  const timestamp = nowIso();

  const candidates: OutfitCandidate[] = [];

  rawOutfits.forEach((raw, index) => {
    const rawSelectedRaw = Array.isArray(raw.selected_items)
      ? raw.selected_items
      : Array.isArray(raw.selectedItems)
        ? raw.selectedItems
        : [];
    const selected = rawSelectedRaw.map(String).filter((id) => knownIds.has(id));

    // Drop outfits that reference unknown / hallucinated IDs
    if (selected.length < 2) return;

    candidates.push({
      id: createId(),
      userId,
      occasion,
      selectedItems: selected,
      reason: typeof raw.reason === "string" && raw.reason.trim() ? raw.reason.trim() : "AI 推荐的搭配方案。",
      style: typeof raw.style === "string" && raw.style.trim() ? raw.style.trim() : hint.style,
      colorLogic:
        typeof raw.color_logic === "string" && raw.color_logic.trim()
          ? raw.color_logic.trim()
          : typeof raw.colorLogic === "string"
            ? raw.colorLogic.trim()
            : "三色以内，重心清楚。",
      userAction: "pending",
      rank: index + 1,
      modelUsed: modelLabel,
      createdAt: timestamp,
    });
  });

  return candidates;
}
