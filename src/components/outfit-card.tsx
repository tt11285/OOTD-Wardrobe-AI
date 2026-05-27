import type { OutfitCandidate, StoredClothingItem } from "@/lib/storage/repository";

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
        {selected.map((item) => (
          <img alt={item.name} key={item.id} src={item.imageUrl} />
        ))}
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
