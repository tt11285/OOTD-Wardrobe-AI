// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SafeImage } from "@/components/safe-image";
import { DressyAvatar } from "@/components/dressy-avatar";
import { ItemCard } from "@/components/item-card";
import { OutfitCard } from "@/components/outfit-card";
import { createDemoItem, type OutfitCandidate } from "@/lib/storage/repository";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
});

async function failImage(selector: string) {
  const image = container.querySelector(selector);
  expect(image).not.toBeNull();
  await act(() => { image!.dispatchEvent(new Event("error")); });
}

describe("image failures", () => {
  it("replaces a broken URL and can load a replacement source", async () => {
    await act(() => root.render(<SafeImage src="https://example.com/missing.png" alt="Shirt" fallback={<span>Unavailable</span>} />));
    await failImage("img");
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("Unavailable");

    await act(() => root.render(<SafeImage src="/images/replacement.png" alt="Shirt" fallback={<span>Unavailable</span>} />));
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/images/replacement.png");
  });

  it("uses the bundled Dressy portrait and handles its failure", async () => {
    await act(() => root.render(<DressyAvatar />));
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/images/dressy.png");
    await failImage("img");
    expect(container.querySelector(".dressy-avatar-fallback")?.textContent).toBe("D");
  });

  it("keeps the item name and edit action when its image is missing", async () => {
    const item = createDemoItem({ userId: "demo-user", name: "White shirt", category: "top", imageUrl: "https://example.com/missing.png" });
    await act(() => root.render(<ItemCard item={item} onEdit={() => {}} />));
    await failImage("img");
    expect(container.querySelector(".item-no-image")).not.toBeNull();
    expect(container.querySelector(".item-name")?.textContent).toBe("White shirt");
    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe("Edit White shirt");
  });

  it("falls back from a missing look to the garment collage and retains piece labels", async () => {
    const item = createDemoItem({ userId: "demo-user", name: "White shirt", category: "top", imageUrl: "https://example.com/shirt.png" });
    const outfit: OutfitCandidate = {
      id: "look-1", userId: "demo-user", occasion: "Commute", selectedItems: [item.id],
      reason: "A classic look", style: "French Minimal", colorLogic: "White", userAction: "pending",
      rank: 1, modelUsed: "curated", createdAt: item.createdAt, lookImageUrl: "https://example.com/missing-look.png",
    };
    await act(() => root.render(<OutfitCard outfit={outfit} items={[item]} onAccept={() => {}} recommended />));
    await failImage(".outfit-look-img");
    expect(container.querySelector(".outfit-look")).toBeNull();
    expect(container.querySelector(".outfit-collage img")?.getAttribute("src")).toBe(item.imageUrl);
    expect(container.querySelectorAll(".outfit-ribbon")).toHaveLength(1);

    await failImage(".outfit-collage img");
    expect(container.querySelector(".outfit-tile-fallback")?.textContent).toContain("White shirt");
    expect(container.querySelector(".outfit-tile-label")?.textContent).toBeTruthy();
  });
});
