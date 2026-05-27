import { describe, expect, it } from "vitest";
import { occasionHint } from "@/lib/domain/occasion";
import { getWardrobeReadiness, validateOutfitItems } from "@/lib/domain/outfits";
import { confidenceTier, normalizeRecognitionItem } from "@/lib/domain/recognition";

describe("recognition domain", () => {
  it("auto accepts confidence at or above 0.85", () => {
    expect(confidenceTier(0.85)).toBe("auto_accepted");
  });

  it("requires review below 0.85", () => {
    expect(confidenceTier(0.84)).toBe("needs_review");
  });

  it("normalizes invalid recognition fields to safe defaults", () => {
    const item = normalizeRecognitionItem({
      name: "",
      category: "dress",
      confidence: 1.5,
    });

    expect(item.name).toBe("未命名单品");
    expect(item.category).toBe("accessory");
    expect(item.confidence).toBe(1);
  });
});

describe("outfit domain", () => {
  it("requires top, bottom, and shoes before generation", () => {
    const readiness = getWardrobeReadiness([
      { id: "1", category: "top" },
      { id: "2", category: "bottom" },
    ]);

    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual(["shoes"]);
  });

  it("rejects outfits referencing unknown item ids", () => {
    expect(validateOutfitItems(["known", "missing"], new Set(["known"]))).toBe(false);
  });
});

describe("occasion domain", () => {
  it("maps interview to high formality", () => {
    expect(occasionHint("面试").formality).toBe(4);
  });
});
