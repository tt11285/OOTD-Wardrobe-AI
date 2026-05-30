import { confidenceTier, normalizeRecognitionItem } from "@/lib/domain/recognition";
import { getWardrobeReadiness } from "@/lib/domain/outfits";
import { recognizeWithOfoxAnthropic, recommendOutfitsWithOfoxAnthropic } from "@/lib/ai/ofox-anthropic";
import { getCuratedOutfits } from "@/lib/style/curated-outfits";
import type { RecognitionRecord, StoredClothingItem, OutfitCandidate, OutfitPiece } from "@/lib/storage/repository";
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

  const toPieces = (list: StoredClothingItem[]): OutfitPiece[] =>
    list.map((it) => ({ itemId: it.id, name: it.name, category: it.category, colors: it.colors, owned: true }));

  const look1 = [...base, ...(outer ? [outer] : [])];
  const look2 = [...base, ...(accessory ? [accessory] : [])];

  return [
    {
      id: createId(),
      userId: items[0]?.userId ?? "demo",
      occasion,
      kind: "wardrobe",
      pieces: toPieces(look1),
      selectedItems: look1.map((item) => item.id),
      reason: "A clean, sharp foundation from your wardrobe — straight trousers and a crisp top, grounded by polished shoes.",
      style: "Urban commute",
      colorLogic: "A steady three-color neutral palette — clean but not flat.",
      userAction: "pending",
      rank: 1,
      modelUsed,
      createdAt: timestamp,
    },
    {
      id: createId(),
      userId: items[0]?.userId ?? "demo",
      occasion,
      kind: "wardrobe",
      pieces: toPieces(look2),
      selectedItems: look2.map((item) => item.id),
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
  // Demo path: hand-curated, guaranteed-beautiful looks for preset occasions
  // when the wardrobe contains the named pieces. Falls through otherwise.
  const curated = getCuratedOutfits(occasion, items);
  if (curated.length >= 2) {
    return curated;
  }

  // Use real Claude recommendations when ofox-anthropic is configured
  if (process.env.OOTD_RECOGNITION_PROVIDER === "ofox-anthropic" && process.env.OFOX_API_KEY) {
    try {
      const userId = items[0]?.userId ?? "server-demo-user";
      const realOutfits = await recommendOutfitsWithOfoxAnthropic(items, occasion, userId);
      if (realOutfits.length > 0) {
        // Guarantee at least one fully-wearable wardrobe look. If the AI only
        // produced aspirational looks, prepend a deterministic wardrobe outfit.
        const hasWardrobe = realOutfits.some((o) => o.kind !== "aspirational" && o.selectedItems.length >= 2);
        if (hasWardrobe) return realOutfits;
        const demo = await generateDemoOutfits(items, occasion);
        return [...demo.slice(0, 1), ...realOutfits].slice(0, 3);
      }
      // Otherwise fall through to deterministic fallback so the demo never breaks
      console.warn("[outfit] AI returned 0 valid outfits, falling back to demo");
    } catch (error) {
      console.error("[outfit] AI generation failed, falling back to demo:", error);
    }
  }

  return generateDemoOutfits(items, occasion);
}
