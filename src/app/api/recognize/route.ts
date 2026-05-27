import { NextRequest, NextResponse } from "next/server";
import { recognizeClothing } from "@/lib/ai/model-router";
import { repository } from "@/lib/storage/repository";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = String(body.userId || "server-demo-user");
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.map(String).slice(0, 10) : [];

  if (imageUrls.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }

  try {
    const results = await recognizeClothing(imageUrls, userId);

    for (const result of results) {
      const savedItem = result.status === "auto_accepted" ? await repository.saveItem(result.item) : null;
      await repository.saveRecognition({
        ...result.record,
        finalItemId: savedItem?.id ?? null,
      });
    }

    await repository.trackEvent(userId, "wardrobe_item_recognized", {
      count: results.length,
      provider: process.env.OOTD_RECOGNITION_PROVIDER || "demo",
    });

    return NextResponse.json({
      results,
      provider: process.env.OOTD_RECOGNITION_PROVIDER || "demo",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recognition failed";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
