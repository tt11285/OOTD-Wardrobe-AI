"use client";

import { useState } from "react";
import type { OutfitCandidate, OutfitPiece, StoredClothingItem } from "@/lib/storage/repository";
import { categoryLabel } from "@/lib/domain/outfits";

function hasRealImage(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("http")) return true;
  if (url.startsWith("data:")) {
    const b64 = url.split(",")[1] ?? "";
    return b64.length > 300;
  }
  return false;
}

type RenderPiece = OutfitPiece & { imageUrl?: string };

export function OutfitCard({
  outfit,
  items,
  onAccept,
  onShare,
  accepted = false,
  recommended = false,
}: {
  outfit: OutfitCandidate;
  items: StoredClothingItem[];
  onAccept: (id: string) => void;
  onShare?: (outfit: OutfitCandidate) => void;
  accepted?: boolean;
  recommended?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState<RenderPiece | null>(null);
  const aspirational = outfit.kind === "aspirational";

  const basePieces: OutfitPiece[] = outfit.pieces?.length
    ? outfit.pieces
    : outfit.selectedItems
        .map((id) => items.find((it) => it.id === id))
        .filter((it): it is StoredClothingItem => Boolean(it))
        .map((it) => ({ itemId: it.id, name: it.name, category: it.category, colors: it.colors, owned: true }));

  const pieces: RenderPiece[] = basePieces.map((p) => {
    const real = p.itemId ? items.find((it) => it.id === p.itemId) : undefined;
    return { ...p, imageUrl: real?.imageUrl };
  });

  const hasLook = hasRealImage(outfit.lookImageUrl);

  return (
    <article
      className={`outfit-card${accepted ? " is-accepted" : ""}${recommended ? " is-recommended" : ""}${aspirational ? " is-aspirational" : ""}`}
    >
      {/* Hero — full-body model wearing the look (falls back to collage) */}
      {hasLook ? (
        <div className="outfit-look">
          {recommended ? (
            <span className="outfit-ribbon">★ Top pick</span>
          ) : aspirational ? (
            <span className="outfit-ribbon outfit-ribbon--goal">Styling goal</span>
          ) : null}
          <img className="outfit-look-img" alt={`Model wearing ${outfit.style}`} src={outfit.lookImageUrl} />
        </div>
      ) : (
        <div className="outfit-collage" data-count={pieces.length}>
          {recommended ? (
            <span className="outfit-ribbon">★ Top pick</span>
          ) : aspirational ? (
            <span className="outfit-ribbon outfit-ribbon--goal">Styling goal</span>
          ) : null}
          {pieces.map((piece, i) => (
            <div className={`outfit-tile${piece.owned ? "" : " outfit-tile--suggested"}`} key={piece.itemId ?? `${piece.name}-${i}`}>
              {piece.owned && hasRealImage(piece.imageUrl) ? (
                <img alt={piece.name} src={piece.imageUrl} />
              ) : (
                <div className="outfit-tile-fallback">
                  {!piece.owned ? <span className="suggested-tag">Suggested</span> : null}
                  <small>{piece.name}</small>
                </div>
              )}
              <span className="outfit-tile-label">{categoryLabel(piece.category)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="outfit-body">
        <p className="outfit-style">{outfit.style}</p>
        <p className="outfit-reason">{outfit.reason}</p>

        {/* Pieces — thumbnail strip; hover/focus to enlarge */}
        <div className="outfit-thumbs" role="list">
          {pieces.map((piece, i) => (
            <div
              role="listitem"
              className={`outfit-thumb${piece.owned ? "" : " outfit-thumb--suggested"}`}
              key={piece.itemId ?? `${piece.name}-${i}`}
              onMouseEnter={() => piece.owned && hasRealImage(piece.imageUrl) && setZoom(piece)}
              onMouseLeave={() => setZoom(null)}
              tabIndex={0}
              onFocus={() => piece.owned && hasRealImage(piece.imageUrl) && setZoom(piece)}
              onBlur={() => setZoom(null)}
              aria-label={`${categoryLabel(piece.category)}: ${piece.name}`}
            >
              {piece.owned && hasRealImage(piece.imageUrl) ? (
                <img alt={piece.name} src={piece.imageUrl} />
              ) : (
                <span className="outfit-thumb-ph">{piece.owned ? piece.name.slice(0, 2) : "+"}</span>
              )}

              {zoom && (zoom.itemId ?? zoom.name) === (piece.itemId ?? piece.name) ? (
                <div className="outfit-zoom" role="tooltip">
                  <img alt={piece.name} src={piece.imageUrl} />
                  <span className="outfit-zoom-name">{piece.name}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <button className="outfit-why" type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          Why this look
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {expanded ? (
          <div className="outfit-detail">
            <p>
              <strong>Color</strong>
              {outfit.colorLogic}
            </p>
            <p>
              <strong>Pieces</strong>
              {pieces.map((p) => p.name).join(", ")}
            </p>
          </div>
        ) : null}

        {aspirational ? (
          <p className="aspirational-note">Inspiration only — pieces marked “Suggested” aren’t in your wardrobe yet.</p>
        ) : (
          <button className="primary-button full-width" onClick={() => onAccept(outfit.id)} type="button" disabled={accepted}>
            {accepted ? "✓ Selected" : "Wear this today"}
          </button>
        )}

        {onShare ? (
          <button className="outfit-share" type="button" onClick={() => onShare(outfit)}>
            Share this look
          </button>
        ) : null}
      </div>
    </article>
  );
}
