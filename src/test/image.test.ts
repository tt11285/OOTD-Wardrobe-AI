import { describe, expect, it } from "vitest";
import { isDisplayableImage } from "@/lib/domain/image";

describe("displayable image sources", () => {
  it("supports public URLs, bundled assets, and inline photos", () => {
    expect(isDisplayableImage("https://example.com/shirt.png")).toBe(true);
    expect(isDisplayableImage("/images/dressy.png")).toBe(true);
    expect(isDisplayableImage(`data:image/webp;base64,${"A".repeat(400)}`)).toBe(true);
  });

  it("rejects missing sources, tiny placeholders, and non-image protocols", () => {
    for (const src of [undefined, "", "http-not-a-url", "javascript:alert(1)", "data:text/html;base64,abcd", "data:image/png;base64,abcd"]) {
      expect(isDisplayableImage(src)).toBe(false);
    }
  });
});
