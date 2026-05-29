import { NextRequest, NextResponse } from "next/server";
import { recognizeClothing } from "@/lib/ai/model-router";
import { extractMany } from "@/lib/ai/gemini-image";
import { repository } from "@/lib/storage/repository";
import { uploadImageToStorage } from "@/lib/storage/supabase";
import { getRequestUserId } from "@/lib/supabase/request-user";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = await getRequestUserId(request, String(body.userId || "server-demo-user"));
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.map(String).slice(0, 10) : [];

  if (imageUrls.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }

  try {
    // ── Stage 1: run recognition (Claude) and background extraction (Gemini)
    //            in PARALLEL — they're independent passes on the same images.
    const [results, extractsByUrl] = await Promise.all([
      recognizeClothing(imageUrls, userId),
      extractMany(imageUrls),
    ]);

    // ── Stage 2: for each recognized item, prefer the extracted (clean) image
    //            and upload to Supabase Storage. Fall back to original if
    //            extraction failed.
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const originalUrl = result.item.imageUrl;
        const extracted = extractsByUrl.get(originalUrl) ?? null;
        const finalDataUrl = extracted ?? originalUrl;
        const imageProcessed = Boolean(extracted);

        const persistedUrl = await uploadImageToStorage(finalDataUrl, userId, result.item.id);

        return {
          ...result,
          item: { ...result.item, imageUrl: persistedUrl },
          record: { ...result.record, imageUrl: persistedUrl },
          imageProcessed,
        };
      }),
    );

    for (const result of enrichedResults) {
      const savedItem = result.status === "auto_accepted" ? await repository.saveItem(result.item) : null;
      await repository.saveRecognition({
        ...result.record,
        finalItemId: savedItem?.id ?? null,
      });
    }

    const processedCount = enrichedResults.filter((r) => r.imageProcessed).length;
    await repository.trackEvent(userId, "wardrobe_item_recognized", {
      count: enrichedResults.length,
      imageProcessedCount: processedCount,
      provider: process.env.OOTD_RECOGNITION_PROVIDER || "demo",
    });

    return NextResponse.json({
      results: enrichedResults,
      provider: process.env.OOTD_RECOGNITION_PROVIDER || "demo",
      imageProcessedCount: processedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recognition failed";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
