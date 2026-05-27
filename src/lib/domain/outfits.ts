import type { ClothingCategory, ClothingItem } from "@/lib/domain/clothing";

type MinimalItem = Pick<ClothingItem, "id" | "category">;

const requiredCategories: ClothingCategory[] = ["top", "bottom", "shoes"];

export type WardrobeReadiness = {
  ready: boolean;
  missing: ClothingCategory[];
};

export function getWardrobeReadiness(items: MinimalItem[]): WardrobeReadiness {
  const categories = new Set(items.map((item) => item.category));
  const missing = requiredCategories.filter((category) => !categories.has(category));

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function validateOutfitItems(itemIds: string[], knownItemIds: Set<string>): boolean {
  return itemIds.length > 0 && itemIds.every((itemId) => knownItemIds.has(itemId));
}

export function categoryLabel(category: ClothingCategory): string {
  const labels: Record<ClothingCategory, string> = {
    top: "上衣",
    bottom: "下装",
    outer: "外套",
    shoes: "鞋",
    accessory: "配饰",
  };

  return labels[category];
}
