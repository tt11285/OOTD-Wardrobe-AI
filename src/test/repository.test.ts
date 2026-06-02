import { beforeEach, describe, expect, it } from "vitest";
import {
  createDemoItem,
  createId,
  memoryRepository,
  resetMemoryRepository,
  toClothingItemRow,
  toStoredClothingItem,
} from "@/lib/storage/repository";

describe("memory repository fallback", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("stores and lists clothing items by user", async () => {
    const item = createDemoItem({
      userId: "user-1",
      name: "White shirt",
      category: "top",
    });

    await memoryRepository.saveItem(item);

    expect(await memoryRepository.listItems("user-1")).toEqual([item]);
    expect(await memoryRepository.listItems("user-2")).toEqual([]);
  });

  it("updates a clothing item without changing other users", async () => {
    const item = createDemoItem({ userId: "user-1", name: "Black trousers", category: "bottom" });
    await memoryRepository.saveItem(item);

    const updated = await memoryRepository.updateItem("user-1", item.id, {
      name: "Black straight trousers",
      manuallyEdited: true,
    });

    expect(updated?.name).toBe("Black straight trousers");
    expect(updated?.manuallyEdited).toBe(true);
    expect(await memoryRepository.updateItem("other", item.id, { name: "Wrong user" })).toBeNull();
  });

  it("creates Supabase-compatible uuid identifiers", () => {
    expect(createId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("maps clothing items to and from Supabase rows", () => {
    const item = createDemoItem({
      userId: "user-1",
      name: "White shirt",
      category: "top",
      imageUrl: "https://example.com/top.png",
      colors: ["white"],
      styleTags: ["commute"],
      season: ["spring"],
      formality: 4,
      confidence: 0.91,
    });
    const row = toClothingItemRow(item);

    expect(row.user_id).toBe("user-1");
    expect(row.image_url).toBe("https://example.com/top.png");
    expect(row.style_tags).toEqual(["commute"]);
    expect(toStoredClothingItem(row)).toEqual(item);
  });
});
