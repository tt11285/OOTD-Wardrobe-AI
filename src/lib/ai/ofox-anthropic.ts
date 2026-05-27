import { confidenceTier, normalizeRecognitionItem } from "@/lib/domain/recognition";
import { createDemoItem, createId, nowIso, type RecognitionRecord, type StoredClothingItem } from "@/lib/storage/repository";

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

  const batches = await Promise.all(imageUrls.map((imageUrl) => recognizeSingleImage({ apiKey, url, model, imageUrl, userId })));
  return batches.flat();
}

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
  const rawItems = Array.isArray(parsed.items) && parsed.items.length ? parsed.items : [{}];

  return rawItems.map((raw) => {
    const normalized = normalizeRecognitionItem(raw as Record<string, unknown>);
    const status = confidenceTier(normalized.confidence);
    const item = createDemoItem({
      userId,
      imageUrl,
      name: normalized.name,
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
      finalItemId: status === "auto_accepted" ? item.id : null,
      createdAt: nowIso(),
    };

    return { record, item, status };
  });
}

function recognitionInstruction(): string {
  return [
    "你是专业服装识别助手。请识别图片中所有可见衣物。",
    "只输出 JSON，不要解释，不要 Markdown。",
    "JSON 格式必须是：",
    '{"items":[{"name":"白色棉质衬衫","category":"top","colors":["白色"],"style_tags":["通勤","简约"],"season":["春","夏"],"formality":3,"confidence":0.9}]}',
    "category 只能是 top, bottom, outer, shoes, accessory。",
    "formality 是 1 到 5 的整数，1=很休闲，5=非常正式。",
    "confidence 是 0 到 1 的数字。看不清时降低 confidence。",
    "如果图片里没有衣物，输出 {\"items\":[]}。",
  ].join("\n");
}
