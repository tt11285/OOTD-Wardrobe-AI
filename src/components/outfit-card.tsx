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
}: {
  outfit: OutfitCandidate;
  items: StoredClothingItem[];
  onAccept: (id: string) => void;
}) {
  const selected = outfit.selectedItems
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is StoredClothingItem => Boolean(item));

  return (
    <article className="outfit-card">
      <div className="outfit-collage">
        {selected.map((item) =>
          hasRealImage(item.imageUrl) ? (
            <img alt={item.name} key={item.id} src={item.imageUrl} />
          ) : (
            <div className="outfit-collage-fallback" key={item.id}>
              <span>{categoryLabel(item.category)}</span>
              <small>{item.name}</small>
            </div>
          ),
        )}
      </div>
      <div className="outfit-body">
        <p className="outfit-style">{outfit.style}</p>
        <h2>方案 {outfit.rank}</h2>
        <p>{outfit.reason}</p>
        <p className="color-logic">{outfit.colorLogic}</p>
        <button className="primary-button full-width" onClick={() => onAccept(outfit.id)} type="button">
          今天就穿这套
        </button>
      </div>
    </article>
  );
}
