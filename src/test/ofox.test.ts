import { describe, expect, it } from "vitest";
import { extractJsonObject, parseDataUrlImage } from "@/lib/ai/ofox-anthropic";

describe("Ofox Anthropic helpers", () => {
  it("parses image data URLs for Anthropic image content", () => {
    const parsed = parseDataUrlImage("data:image/jpeg;base64,abc123");

    expect(parsed).toEqual({
      mediaType: "image/jpeg",
      data: "abc123",
    });
  });

  it("extracts JSON object from model text", () => {
    const result = extractJsonObject('识别结果如下：{"items":[{"name":"黑色外套"}]}');

    expect(result).toEqual({
      items: [{ name: "黑色外套" }],
    });
  });
});
