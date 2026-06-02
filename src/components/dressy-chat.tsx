"use client";

import { useEffect, useRef, useState } from "react";
import { DressyAvatar } from "@/components/dressy-avatar";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { OutfitCandidate } from "@/lib/storage/repository";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["More casual", "Swap the shoes", "No jacket", "Dressier please"];

// Floating Dressy chat: tap the avatar to open a panel, give feedback, and
// Dressy replies + restyles the outfits in place (via onOutfits).
export function DressyChat({
  userId,
  occasion,
  onOutfits,
}: {
  userId: string;
  occasion: string;
  onOutfits: (outfits: OutfitCandidate[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi, I'm Dressy. Tell me the vibe or what to tweak, and I'll style a look from your wardrobe." },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  // Draggable FAB position (offset from its default bottom-right anchor).
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    setPos({ x: d.ox + dx, y: d.oy + dy });
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    // Treat as a click (toggle) only if the pointer barely moved.
    if (d && !d.moved) setOpen((v) => !v);
  }

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setBusy(true);
    try {
      const res = await authedFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, occasion, message: msg, history }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "Done." }]);
      if (Array.isArray(data.outfits) && data.outfits.length) onOutfits(data.outfits);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I hit a snag — try again?" }]);
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        className={`dressy-fab${open ? " is-open" : ""}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label={open ? "Close chat with Dressy" : "Chat with Dressy"}
        title="Drag to move · tap to chat"
      >
        <DressyAvatar size={56} />
        {!open ? <span className="dressy-fab-hint">Ask Dressy</span> : null}
      </button>

      {open ? (
        <div className="dressy-panel" role="dialog" aria-label="Chat with Dressy">
          <div className="dressy-panel-head">
            <DressyAvatar size={32} />
            <div>
              <strong>Dressy</strong>
              <span>your stylist</span>
            </div>
            <button type="button" className="dressy-panel-close" onClick={() => setOpen(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="dressy-msgs" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`dressy-msg dressy-msg--${m.role}`}>{m.content}</div>
            ))}
            {busy ? <div className="dressy-msg dressy-msg--assistant dressy-typing">Dressy is restyling…</div> : null}
          </div>

          <div className="dressy-suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} disabled={busy}>{s}</button>
            ))}
          </div>

          <form
            className="dressy-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. make it warmer for winter"
              disabled={busy}
            />
            <button type="submit" className="primary-button" disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
