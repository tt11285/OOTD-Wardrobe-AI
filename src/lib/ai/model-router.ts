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
    name: "Off-white shirt",
    category: "top",
    colors: ["off-white"],
    style_tags: ["commute", "minimal"],
    season: ["spring", "summer", "autumn"],
    formality: 4,
    confidence: 0.92,
  },
  {
    name: "Black straight trousers",
    category: "bottom",
    colors: ["black"],
    style_tags: ["sharp", "commute"],
    season: ["spring", "autumn", "winter"],
    formality: 4,
    confidence: 0.9,
  },
  {
    name: "Brown loafers",
    category: "shoes",
    colors: ["brown"],
    style_tags: ["vintage", "refined"],
    season: ["spring", "autumn"],
    formality: 3,
    confidence: 0.89,
  },
  {
    name: "Khaki trench coat",
    category: "outer",
    colors: ["khaki"],
    style_tags: ["french", "commute"],
    season: ["spring", "autumn"],
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
      reason: "The shirt and straight trousers set a sharp tone, while the loafers keep the formality from feeling stiff — an easy way to look professional fast.",
      style: "Urban commute",
      colorLogic: "Off-white, black and brown form a steady three-color palette — clean but not flat.",
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
      reason: "Keeps a clean silhouette and adds a simple accessory for polish — looks considered without any morning effort.",
      style: "French minimal",
      colorLogic: "Low-saturation neutrals kept within three colors, with a clear visual focus.",
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
