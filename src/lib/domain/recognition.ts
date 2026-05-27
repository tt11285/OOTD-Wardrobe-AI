import {
  clampFormality,
  ClothingCategory,
  isClothingCategory,
  normalizeStringList,
} from "@/lib/domain/clothing";

export type RecognitionStatus = "auto_accepted" | "needs_review" | "failed";

export type NormalizedRecognitionItem = {
  name: string;
  category: ClothingCategory;
  colors: string[];
  styleTags: string[];
  season: string[];
  formality: number;
  confidence: number;
};

type RawRecognitionItem = {
  name?: unknown;
  category?: unknown;
  colors?: unknown;
  style_tags?: unknown;
  styleTags?: unknown;
  season?: unknown;
  formality?: unknown;
  confidence?: unknown;
};

export function confidenceTier(confidence: number): RecognitionStatus {
  if (!Number.isFinite(confidence) || confidence < 0.25) {
    return "failed";
  }

  return confidence >= 0.85 ? "auto_accepted" : "needs_review";
}

export function clampConfidence(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0.7;
  return Math.min(1, Math.max(0, numeric));
}

export function normalizeRecognitionItem(raw: RawRecognitionItem): NormalizedRecognitionItem {
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "未命名单品";

  return {
    name,
    category: isClothingCategory(raw.category) ? raw.category : "accessory",
    colors: normalizeStringList(raw.colors),
    styleTags: normalizeStringList(raw.styleTags ?? raw.style_tags),
    season: normalizeStringList(raw.season),
    formality: clampFormality(raw.formality),
    confidence: clampConfidence(raw.confidence),
  };
}
