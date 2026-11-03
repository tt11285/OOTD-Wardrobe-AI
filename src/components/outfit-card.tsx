"use client";

import { useState } from "react";
import type { OutfitCandidate, OutfitPiece, StoredClothingItem } from "@/lib/storage/repository";
import { categoryLabel } from "@/lib/domain/outfits";
import { isDisplayableImage } from "@/lib/domain/image";
import { SafeImage } from "@/components/safe-image";

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
  const [failedLookSrc, setFailedLookSrc] = useState<string>();
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

  const ribbon = recommended ? (
    <span className="outfit-ribbon">★ Top pick</span>
  ) : aspirational ? (
    <span className="outfit-ribbon outfit-ribbon--goal">Styling goal</span>
  ) : null;

  const collage = (
    <div className="outfit-collage" data-count={pieces.length}>
      {ribbon}
      {pieces.map((piece, i) => (
        <div className={`outfit-tile${piece.owned ? "" : " outfit-tile--suggested"}`} key={piece.itemId ?? `${piece.name}-${i}`}>
          <SafeImage
            alt={piece.name}
            src={piece.owned ? piece.imageUrl : undefined}
            fallback={
              <div className="outfit-tile-fallback">
                {!piece.owned ? <span className="suggested-tag">Suggested</span> : null}
                <small>{piece.name}</small>
              </div>
            }
          />
          <span className="outfit-tile-label">{categoryLabel(piece.category)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <article
      className={`outfit-card${accepted ? " is-accepted" : ""}${recommended ? " is-recommended" : ""}${aspirational ? " is-aspirational" : ""}`}
    >
      {/* Hero — full-body model wearing the look (falls back to collage) */}
      {isDisplayableImage(outfit.lookImageUrl) && outfit.lookImageUrl !== failedLookSrc ? (
        <div className="outfit-look">
          {ribbon}
          <SafeImage
            className="outfit-look-img"
            alt={`Model wearing ${outfit.style}`}
            src={outfit.lookImageUrl}
            onError={() => setFailedLookSrc(outfit.lookImageUrl)}
            fallback={null}
          />
        </div>
      ) : collage}

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
              onMouseEnter={() => piece.owned && isDisplayableImage(piece.imageUrl) && setZoom(piece)}
              onMouseLeave={() => setZoom(null)}
              tabIndex={0}
              onFocus={() => piece.owned && isDisplayableImage(piece.imageUrl) && setZoom(piece)}
              onBlur={() => setZoom(null)}
              aria-label={`${categoryLabel(piece.category)}: ${piece.name}`}
            >
              <SafeImage
                alt={piece.name}
                src={piece.owned ? piece.imageUrl : undefined}
                fallback={<span className="outfit-thumb-ph">{piece.owned ? piece.name.slice(0, 2) : "+"}</span>}
              />

              {zoom && (zoom.itemId ?? zoom.name) === (piece.itemId ?? piece.name) ? (
                <div className="outfit-zoom" role="tooltip">
                  <SafeImage alt={piece.name} src={piece.imageUrl} fallback={<span className="outfit-thumb-ph">No image</span>} />
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
