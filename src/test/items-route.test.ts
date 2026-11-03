import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/items/route";
import { repository } from "@/lib/storage/repository";

vi.mock("@/lib/storage/repository", () => ({
  repository: { listItems: vi.fn() },
}));
vi.mock("@/lib/supabase/request-user", () => ({
  getRequestUserId: vi.fn(async (_request, fallback) => fallback),
}));

afterEach(() => vi.restoreAllMocks());

describe("wardrobe service availability", () => {
  it("returns a retryable error instead of an empty wardrobe when storage is down", async () => {
    vi.mocked(repository.listItems).mockRejectedValue(new Error("fetch failed: ENOTFOUND"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(new NextRequest("http://localhost/api/items?userId=demo-user"));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.error).toMatch(/temporarily unavailable/);
    expect(body.items).toBeUndefined();
  });

  it("preserves a successful empty wardrobe response", async () => {
    vi.mocked(repository.listItems).mockResolvedValue([]);
    const response = await GET(new NextRequest("http://localhost/api/items?userId=demo-user"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
  });
});
