import { describe, expect, it } from "vitest";
import { demoRecognizeClothing, generateDemoOutfits, modelConfig } from "@/lib/ai/model-router";
import type { StoredClothingItem } from "@/lib/storage/repository";

describe("AI model router", () => {
  it("uses demo defaults when model env is absent", () => {
    expect(modelConfig().recognitionModel).toBeTruthy();
    expect(modelConfig().recommendationModel).toBeTruthy();
  });

  it("returns deterministic demo recognition items", async () => {
    const result = await demoRecognizeClothing(["one", "two"], "user-1");

    expect(result).toHaveLength(2);
    expect(result[0]?.item.name).toBeTruthy();
    expect(result[0]?.status).toBe("auto_accepted");
  });

  it("generates outfits with only known item ids", async () => {
    const items: StoredClothingItem[] = [
      item("top-1", "top"),
      item("bottom-1", "bottom"),
      item("shoes-1", "shoes"),
    ];

    const outfits = await generateDemoOutfits(items, "面试");

    expect(outfits).toHaveLength(2);
    expect(outfits.every((outfit) => outfit.selectedItems.every((id) => items.some((item) => item.id === id)))).toBe(
      true,
    );
  });
});

function item(id: string, category: StoredClothingItem["category"]): StoredClothingItem {
  return {
    id,
    userId: "user-1",
    imageUrl: "",
    category,
    name: id,
    brand: "",
    material: "",
    colors: ["黑色"],
    styleTags: ["简约"],
    season: ["春"],
    formality: 3,
    confidence: 0.9,
    manuallyEdited: false,
    createdAt: "2026-05-27T00:00:00.000Z",
    updatedAt: "2026-05-27T00:00:00.000Z",
  };
}
