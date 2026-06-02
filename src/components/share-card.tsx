"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { OutfitCandidate, OutfitPiece, StoredClothingItem } from "@/lib/storage/repository";

function realImg(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("http")) return true;
  if (url.startsWith("data:")) return (url.split(",")[1]?.length ?? 0) > 300;
  return false;
}

// A shareable, screenshot-ready OOTD card with a PNG download (best-effort).
export function ShareCard({
  outfit,
  items,
  onClose,
}: {
  outfit: OutfitCandidate;
  items: StoredClothingItem[];
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const basePieces: OutfitPiece[] = outfit.pieces?.length
    ? outfit.pieces
    : outfit.selectedItems
        .map((id) => items.find((it) => it.id === id))
        .filter((it): it is StoredClothingItem => Boolean(it))
        .map((it) => ({ itemId: it.id, name: it.name, category: it.category, colors: it.colors, owned: true }));

  const pieces = basePieces
    .map((p) => ({ ...p, imageUrl: p.itemId ? items.find((it) => it.id === p.itemId)?.imageUrl : undefined }))
    .slice(0, 4);

  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#fffcf9" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ootd-${outfit.style.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
    } catch (err) {
      console.error("[share] export failed:", err);
      alert("Couldn't export the image here — you can screenshot the card instead.");
    }
    setBusy(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="share-wrap" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Share look">
        <div className="share-card" ref={cardRef}>
          <div className="share-card-head">
            <span className="share-card-brand">OOTD</span>
            <span className="share-card-occasion">{outfit.occasion}</span>
          </div>
          <div className="share-card-collage">
            {pieces.map((p, i) => (
              <span key={p.itemId ?? `${p.name}-${i}`}>
                {realImg(p.imageUrl) ? <img src={p.imageUrl} alt={p.name} crossOrigin="anonymous" /> : null}
              </span>
            ))}
          </div>
          <div className="share-card-body">
            <p className="share-card-style">{outfit.style}</p>
            <p className="share-card-reason">{outfit.reason}</p>
            <p className="share-card-foot">Styled by Dressy · OOTD</p>
          </div>
        </div>
        <div className="share-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary-button" type="button" onClick={download} disabled={busy}>
            {busy ? "Saving…" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
