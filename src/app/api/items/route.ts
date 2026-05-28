import { NextRequest, NextResponse } from "next/server";
import { isClothingCategory, normalizeStringList, clampFormality } from "@/lib/domain/clothing";
import { createDemoItem, repository } from "@/lib/storage/repository";
import { uploadImageToStorage } from "@/lib/storage/supabase";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") || "server-demo-user";
  const items = await repository.listItems(userId);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = String(body.userId || "server-demo-user");
  const category = isClothingCategory(body.category) ? body.category : "accessory";

  // If the caller sent a base64 data URL (manually-confirmed item from upload page),
  // upload it to Supabase Storage first so we persist a proper CDN URL.
  const rawImageUrl = String(body.imageUrl || "");
  const itemId = String(body.id || crypto.randomUUID());
  const imageUrl = rawImageUrl.startsWith("data:")
    ? await uploadImageToStorage(rawImageUrl, userId, itemId)
    : rawImageUrl;

  const item = createDemoItem({
    userId,
    imageUrl,
    name: String(body.name || "未命名单品"),
    category,
    colors: normalizeStringList(body.colors),
    styleTags: normalizeStringList(body.styleTags),
    season: normalizeStringList(body.season),
    formality: clampFormality(body.formality),
    confidence: typeof body.confidence === "number" ? body.confidence : 0.7,
  });

  const saved = await repository.saveItem({ ...item, id: itemId, manuallyEdited: Boolean(body.manuallyEdited) });
  return NextResponse.json({ item: saved });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const userId = String(body.userId || "server-demo-user");
  const itemId = String(body.itemId || "");
  const updated = await repository.updateItem(userId, itemId, {
    name: typeof body.name === "string" ? body.name : undefined,
    category: isClothingCategory(body.category) ? body.category : undefined,
    colors: Array.isArray(body.colors) ? normalizeStringList(body.colors) : undefined,
    styleTags: Array.isArray(body.styleTags) ? normalizeStringList(body.styleTags) : undefined,
    season: Array.isArray(body.season) ? normalizeStringList(body.season) : undefined,
    formality: body.formality === undefined ? undefined : clampFormality(body.formality),
    manuallyEdited: true,
  });

  if (!updated) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}
