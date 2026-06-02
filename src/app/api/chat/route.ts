import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/storage/repository";
import { getRequestUserId } from "@/lib/supabase/request-user";
import { chatWithDressy, type ChatTurn } from "@/lib/ai/ofox-anthropic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = await getRequestUserId(request, String(body.userId || "server-demo-user"));
  const message = String(body.message || "").slice(0, 1000);
  const occasion = String(body.occasion || "everyday");
  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter((t: unknown): t is ChatTurn => {
          const r = (t as ChatTurn)?.role;
          return (r === "user" || r === "assistant") && typeof (t as ChatTurn).content === "string";
        })
        .slice(-6)
    : [];

  if (!message.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const items = await repository.listItems(userId);

  // Chat needs the real stylist (Claude). Without it, reply gracefully.
  if (process.env.OOTD_RECOGNITION_PROVIDER !== "ofox-anthropic" || !process.env.OFOX_API_KEY) {
    return NextResponse.json({
      reply: "I'm not fully online right now, but tell me what you'd like to change and I'll keep it in mind.",
      outfits: [],
    });
  }

  try {
    const { reply, outfits } = await chatWithDressy(message, history, items, occasion, userId);
    if (outfits.length) await repository.saveOutfits(outfits.filter((o) => o.kind !== "aspirational"));
    await repository.trackEvent(userId, "dressy_chat", { occasion, revised: outfits.length });
    return NextResponse.json({ reply, outfits, items });
  } catch (error) {
    console.error("[chat] failed:", error);
    return NextResponse.json({
      reply: "Sorry, I hit a snag styling that. Want to try rephrasing what you'd like to change?",
      outfits: [],
    });
  }
}
