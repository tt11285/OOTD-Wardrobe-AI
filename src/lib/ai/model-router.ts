import { confidenceTier, normalizeRecognitionItem } from "@/lib/domain/recognition";
import { getWardrobeReadiness } from "@/lib/domain/outfits";
import { recognizeWithOfoxAnthropic, recommendOutfitsWithOfoxAnthropic } from "@/lib/ai/ofox-anthropic";
import type { RecognitionRecord, StoredClothingItem, OutfitCandidate } from "@/lib/storage/repository";
import { createDemoItem, createId, nowIso } from "@/lib/storage/repository";

export type RecognitionResponse = {
  record: RecognitionRecord;
  item: StoredClothingItem;
  status: RecognitionRecord["status"];
};

export function modelConfig(): { recognitionModel: string; recommendationModel: string } {
  return {
    recognitionModel: process.env.OOTD_RECOGNITION_MODEL || "demo-recognition",
    recommendationModel: process.env.OOTD_RECOMMENDATION_MODEL || "demo-outfit",
  };
}

const demoWardrobe = [
  {
    name: "米白色衬衫",
    category: "top",
    colors: ["米白"],
    style_tags: ["通勤", "简约"],
    season: ["春", "夏", "秋"],
    formality: 4,
    confidence: 0.92,
  },
  {
    name: "黑色直筒裤",
    category: "bottom",
    colors: ["黑色"],
    style_tags: ["利落", "通勤"],
    season: ["春", "秋", "冬"],
    formality: 4,
    confidence: 0.9,
  },
  {
    name: "棕色乐福鞋",
    category: "shoes",
    colors: ["棕色"],
    style_tags: ["复古", "精致"],
    season: ["春", "秋"],
    formality: 3,
    confidence: 0.89,
  },
  {
    name: "浅卡其风衣",
    category: "outer",
    colors: ["卡其"],
    style_tags: ["法式", "通勤"],
    season: ["春", "秋"],
    formality: 3,
    confidence: 0.82,
  },
] as const;

export async function demoRecognizeClothing(imageUrls: string[], userId: string): Promise<RecognitionResponse[]> {
  return imageUrls.map((imageUrl, index) => {
    const raw = demoWardrobe[index % demoWardrobe.length];
    const normalized = normalizeRecognitionItem(raw);
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

export async function recognizeClothing(imageUrls: string[], userId: string): Promise<RecognitionResponse[]> {
  if (process.env.OOTD_RECOGNITION_PROVIDER === "ofox-anthropic") {
    return recognizeWithOfoxAnthropic(imageUrls, userId);
  }

  return demoRecognizeClothing(imageUrls, userId);
}

export async function generateDemoOutfits(items: StoredClothingItem[], occasion: string): Promise<OutfitCandidate[]> {
  const readiness = getWardrobeReadiness(items);

  if (!readiness.ready) {
    return [];
  }

  const firstByCategory = (category: StoredClothingItem["category"]) => items.find((item) => item.category === category);
  const base = [firstByCategory("top"), firstByCategory("bottom"), firstByCategory("shoes")].filter(
    (item): item is StoredClothingItem => Boolean(item),
  );
  const outer = firstByCategory("outer");
  const accessory = firstByCategory("accessory");
  const modelUsed = modelConfig().recommendationModel;
  const timestamp = nowIso();

  return [
    {
      id: createId(),
      userId: items[0]?.userId ?? "demo",
      occasion,
      selectedItems: [...base, ...(outer ? [outer] : [])].map((item) => item.id),
      reason: "衬衫和直筒裤建立干练感，乐福鞋让正式度不僵硬，适合快速进入专业状态。",
      style: "都市通勤",
      colorLogic: "米白、黑色和棕色形成稳定三色，干净但不单调。",
      userAction: "pending",
      rank: 1,
      modelUsed,
      createdAt: timestamp,
    },
    {
      id: createId(),
      userId: items[0]?.userId ?? "demo",
      occasion,
      selectedItems: [...base, ...(accessory ? [accessory] : [])].map((item) => item.id),
      reason: "保留利落轮廓，用简洁配饰增加完成度，早晨不用多想也能显得认真。",
      style: "法式极简",
      colorLogic: "低饱和中性色控制在三色以内，视觉重心清楚。",
      userAction: "pending",
      rank: 2,
      modelUsed,
      createdAt: timestamp,
    },
  ];
}

export async function generateOutfits(items: StoredClothingItem[], occasion: string): Promise<OutfitCandidate[]> {
  // Use real Claude recommendations when ofox-anthropic is configured
  if (process.env.OOTD_RECOGNITION_PROVIDER === "ofox-anthropic" && process.env.OFOX_API_KEY) {
    try {
      const userId = items[0]?.userId ?? "server-demo-user";
      const realOutfits = await recommendOutfitsWithOfoxAnthropic(items, occasion, userId);
      // If AI returned at least one valid outfit, use it
      if (realOutfits.length > 0) {
        return realOutfits;
      }
      // Otherwise fall through to deterministic fallback so the demo never breaks
      console.warn("[outfit] AI returned 0 valid outfits, falling back to demo");
    } catch (error) {
      console.error("[outfit] AI generation failed, falling back to demo:", error);
    }
  }

  return generateDemoOutfits(items, occasion);
}
