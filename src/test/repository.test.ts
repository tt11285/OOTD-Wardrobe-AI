import { beforeEach, describe, expect, it } from "vitest";
import { createDemoItem, memoryRepository, resetMemoryRepository } from "@/lib/storage/repository";

describe("memory repository fallback", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("stores and lists clothing items by user", async () => {
    const item = createDemoItem({
      userId: "user-1",
      name: "白色衬衫",
      category: "top",
    });

    await memoryRepository.saveItem(item);

    expect(await memoryRepository.listItems("user-1")).toEqual([item]);
    expect(await memoryRepository.listItems("user-2")).toEqual([]);
  });

  it("updates a clothing item without changing other users", async () => {
    const item = createDemoItem({ userId: "user-1", name: "黑色长裤", category: "bottom" });
    await memoryRepository.saveItem(item);

    const updated = await memoryRepository.updateItem("user-1", item.id, {
      name: "黑色直筒裤",
      manuallyEdited: true,
    });

    expect(updated?.name).toBe("黑色直筒裤");
    expect(updated?.manuallyEdited).toBe(true);
    expect(await memoryRepository.updateItem("other", item.id, { name: "错用户" })).toBeNull();
  });
});
