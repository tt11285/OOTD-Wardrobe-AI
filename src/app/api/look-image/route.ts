import { NextRequest, NextResponse } from "next/server";
import { generateLookImage } from "@/lib/ai/look-image";

// Generates a full-body model image for a single (chat-restyled) outfit on
// demand. Returns { url } or { url: null } — the client falls back to the
// collage when null.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const lookId = String(body.lookId || "").slice(0, 64) || crypto.randomUUID();
  const pieces = Array.isArray(body.pieces)
    ? body.pieces
        .filter((p: unknown) => p && typeof (p as { name?: unknown }).name === "string")
        .map((p: { name: string; category?: string }) => ({ name: String(p.name), category: String(p.category ?? "") }))
        .slice(0, 6)
    : [];

  if (pieces.length < 2) {
    return NextResponse.json({ url: null });
  }

  const url = await generateLookImage(pieces, lookId);
  return NextResponse.json({ url });
}
