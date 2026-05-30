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
      const item = createDemoItem({ userId, imageUrl, name: "识别失败", category: "top" });
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
    const item = createDemoItem({ userId, imageUrl, name: "未知衣物", category: "top" });
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
    "你是专业服装识别助手。请只识别图片中**最主要的一件**衣物（画面占比最大、最突出的那件），忽略其他次要单品。",
    "只输出 JSON，不要解释，不要 Markdown。",
    "items 数组只放这一件。JSON 格式必须是：",
    '{"items":[{"name":"白色棉质衬衫","category":"top","material":"棉","colors":["白色"],"style_tags":["通勤","简约"],"season":["春","夏"],"formality":3,"confidence":0.9}]}',
    "category 只能是 top, bottom, outer, shoes, accessory。",
    "material 是面料的中文猜测（如 棉、羊毛、牛仔、皮革、针织、雪纺），看不清就留空字符串。",
    "不要识别品牌（brand 由用户自己填）。",
    "formality 是 1 到 5 的整数，1=很休闲，5=非常正式。",
    "confidence 是 0 到 1 的数字。看不清时降低 confidence。",
    "如果图片里没有衣物，输出 {\"items\":[]}。",
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
    "你是一位法式极简风格 + 都市通勤美学的造型师。",
    stylePromptContext(hint),
    ...(referencesBlock
      ? ["", "【参考案例（审美知识库召回，供参考，不要照抄）】", referencesBlock]
      : []),
    "",
    "下面是用户**真实衣橱**（请只引用这里的 id，不要编造）：",
    JSON.stringify(wardrobeSummary, null, 2),
    "",
    `今日场合：${occasion}`,
    "",
    "请生成 2-3 套搭配，输出严格的 JSON（不要 Markdown，不要解释），格式：",
    '{"outfits":[{"selected_items":["id1","id2","id3"],"style":"法式极简","reason":"为什么这样搭，2-3 句即可","color_logic":"色彩搭配说明，1-2 句"}]}',
    "",
    "硬规则：",
    "- 每套至少包含 1 件 top、1 件 bottom、1 件 shoes，可选 outer 和 accessory。",
    "- 全身主色不超过 3 种。",
    `- 正式度要贴近 ${hint.formality}（1=很休闲，5=很正式）。`,
    "- reason 要中文，像专业造型师在和好友说话，不要列条目。",
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
