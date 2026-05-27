export const clothingCategories = ["top", "bottom", "outer", "shoes", "accessory"] as const;

export type ClothingCategory = (typeof clothingCategories)[number];

export type ClothingItem = {
  id: string;
  userId?: string;
  imageUrl?: string;
  category: ClothingCategory;
  name?: string;
  colors?: string[];
  styleTags?: string[];
  season?: string[];
  formality?: number;
  confidence?: number;
  manuallyEdited?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export function isClothingCategory(value: unknown): value is ClothingCategory {
  return typeof value === "string" && clothingCategories.includes(value as ClothingCategory);
}

export function clampFormality(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 3;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 6);
}
