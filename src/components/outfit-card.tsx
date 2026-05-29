"use client";

import { useState } from "react";
import type { OutfitCandidate, StoredClothingItem } from "@/lib/storage/repository";
import { categoryLabel } from "@/lib/domain/outfits";

function hasRealImage(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("http")) return true;
  if (url.startsWith("data:")) {
    const b64 = url.split(",")[1] ?? "";
    return b64.length > 300;
  }
  return false;
}

export function OutfitCard({
  outfit,
  items,
  onAccept,
  accepted = false,
}: {
  outfit: OutfitCandidate;
  items: StoredClothingItem[];
  onAccept: (id: string) => void;
  accepted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const selected = outfit.selectedItems
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is StoredClothingItem => Boolean(item));

  return (
    <article className={`outfit-card${accepted ? " is-accepted" : ""}`}>
      <div className="outfit-collage" data-count={selected.length}>
        {selected.map((item) => (
          <div className="outfit-tile" key={item.id}>
            {hasRealImage(item.imageUrl) ? (
              <img alt={item.name} src={item.imageUrl} />
            ) : (
              <div className="outfit-tile-fallback">
                <small>{item.name}</small>
              </div>
            )}
            <span className="outfit-tile-label">{categoryLabel(item.category)}</span>
          </div>
        ))}
      </div>

      <div className="outfit-body">
        <div className="outfit-head">
          <p className="outfit-style">{outfit.style}</p>
          {accepted ? <span className="status-badge success">今天就穿这套</span> : null}
        </div>

        <h2>{outfit.reason}</h2>

        <ul className="outfit-items">
          {selected.map((item) => (
            <li key={item.id}>
              <span className="outfit-item-cat">{categoryLabel(item.category)}</span>
              <span className="outfit-item-name">{item.name}</span>
            </li>
          ))}
        </ul>

        <button
          className="outfit-why"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          为什么这样搭
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {expanded ? (
          <div className="outfit-detail">
            <p>
              <strong>色彩</strong>
              {outfit.colorLogic}
            </p>
            <p>
              <strong>风格</strong>
              {outfit.style} · 正式度与场合匹配，单品都来自你的真实衣橱。
            </p>
          </div>
        ) : null}

        <button
          className="primary-button full-width"
          onClick={() => onAccept(outfit.id)}
          type="button"
          disabled={accepted}
        >
          {accepted ? "✓ 已选定" : "今天就穿这套"}
        </button>
      </div>
    </article>
  );
}
