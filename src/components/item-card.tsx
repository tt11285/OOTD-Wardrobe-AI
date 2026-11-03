import type { StoredClothingItem } from "@/lib/storage/repository";
import { categoryLabel } from "@/lib/domain/outfits";
import { SafeImage } from "@/components/safe-image";

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

export function ItemCard({
  item,
  onEdit,
}: {
  item: StoredClothingItem;
  onEdit?: (item: StoredClothingItem) => void;
}) {
  return (
    <article className="item-card">
      <div className="item-image-wrap">
        <SafeImage
          alt={item.name}
          className="item-image"
          src={item.imageUrl}
          fallback={<NoImagePlaceholder name={item.name} />}
        />
        {onEdit ? (
          <button
            className="item-edit-btn"
            type="button"
            onClick={() => onEdit(item)}
            aria-label={`Edit ${item.name}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="item-body">
        <div>
          <p className="item-name">{item.name}</p>
          <p className="item-meta">
            {[categoryLabel(item.category), item.brand, item.material].filter(Boolean).join(" · ")}
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
