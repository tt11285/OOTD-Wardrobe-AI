import type { StoredClothingItem } from "@/lib/storage/repository";
import { categoryLabel } from "@/lib/domain/outfits";

export function ItemCard({ item }: { item: StoredClothingItem }) {
  return (
    <article className="item-card">
      <div className="item-image-wrap">
        {item.imageUrl ? <img alt={item.name} className="item-image" src={item.imageUrl} /> : null}
      </div>
      <div className="item-body">
        <div>
          <p className="item-name">{item.name}</p>
          <p className="item-meta">
            {categoryLabel(item.category)} · 正式度 {item.formality}
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
