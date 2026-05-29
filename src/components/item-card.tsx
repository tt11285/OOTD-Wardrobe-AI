import type { StoredClothingItem } from "@/lib/storage/repository";
import { categoryLabel } from "@/lib/domain/outfits";

// A pale icon placeholder shown when no real image is available yet
function NoImagePlaceholder({ name }: { name: string }) {
  return (
    <div className="item-no-image" aria-label={`${name} — no image`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span>No image</span>
    </div>
  );
}

// A valid clothing photo has at least ~500 base64 chars (> 375 bytes).
// The 1×1 placeholder PNGs in the database are only 114 chars.
function isRealImage(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("http")) return true; // Supabase Storage CDN URL
  if (url.startsWith("data:")) {
    const b64 = url.split(",")[1] ?? "";
    return b64.length > 300; // real photo is much larger
  }
  return false;
}

export function ItemCard({ item }: { item: StoredClothingItem }) {
  return (
    <article className="item-card">
      <div className="item-image-wrap">
        {isRealImage(item.imageUrl) ? (
          <img alt={item.name} className="item-image" src={item.imageUrl} />
        ) : (
          <NoImagePlaceholder name={item.name} />
        )}
      </div>
      <div className="item-body">
        <div>
          <p className="item-name">{item.name}</p>
          <p className="item-meta">
            {categoryLabel(item.category)} · Formality {item.formality}
          </p>
        </div>
        <div className="tag-row">
          {item.colors.slice(0, 2).map((color) => (
            <span className="pill" key={color}>
              {color}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
