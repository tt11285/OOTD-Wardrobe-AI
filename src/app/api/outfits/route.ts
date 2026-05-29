import { NextRequest, NextResponse } from "next/server";
import { generateOutfits } from "@/lib/ai/model-router";
import { getWardrobeReadiness } from "@/lib/domain/outfits";
import { repository } from "@/lib/storage/repository";
import { getRequestUserId } from "@/lib/supabase/request-user";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = await getRequestUserId(request, String(body.userId || "server-demo-user"));
  const occasion = String(body.occasion || "通勤");
  const items = await repository.listItems(userId);
  const readiness = getWardrobeReadiness(items);

  if (!readiness.ready) {
    return NextResponse.json({ error: "Wardrobe incomplete", missing: readiness.missing }, { status: 422 });
  }

  const outfits = await generateOutfits(items, occasion);
  const saved = await repository.saveOutfits(outfits);
  await repository.trackEvent(userId, "outfit_generated", { occasion, count: saved.length });

  return NextResponse.json({ outfits: saved, items });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const userId = await getRequestUserId(request, String(body.userId || "server-demo-user"));
  const outfitId = String(body.outfitId || "");
  const accepted = await repository.acceptOutfit(userId, outfitId);

  if (!accepted) {
    return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
  }

  await repository.trackEvent(userId, "outfit_accepted", { outfitId });
  return NextResponse.json({ outfit: accepted });
}
