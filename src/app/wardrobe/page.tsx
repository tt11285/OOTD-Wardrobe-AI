"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { ItemCard } from "@/components/item-card";
import { clothingCategories, type ClothingCategory } from "@/lib/domain/clothing";
import { categoryLabel } from "@/lib/domain/outfits";
import { getAnonymousUserId } from "@/lib/state/user";
import type { StoredClothingItem } from "@/lib/storage/repository";

export default function WardrobePage() {
  const userId = useMemo(() => getAnonymousUserId(), []);
  const [items, setItems] = useState<StoredClothingItem[]>([]);
  const [filter, setFilter] = useState<ClothingCategory | "all">("all");

  useEffect(() => {
    fetch(`/api/items?userId=${encodeURIComponent(userId)}`)
      .then((response) => response.json())
      .then((data) => setItems(data.items ?? []));
  }, [userId]);

  const visible = filter === "all" ? items : items.filter((item) => item.category === filter);

  return (
    <main className="app-page mobile-shell">
      <header className="screen-header">
        <p className="eyebrow">WARDROBE</p>
        <h1>Your digital wardrobe</h1>
        <p>{items.length ? `${items.length} item${items.length > 1 ? "s" : ""} in your wardrobe` : "Snap a few clothes to get started."}</p>
      </header>

      {items.length ? (
        <>
          <div className="filter-row">
            <button className={filter === "all" ? "chip active" : "chip"} onClick={() => setFilter("all")} type="button">
              All
            </button>
            {clothingCategories.map((category) => (
              <button
                className={filter === category ? "chip active" : "chip"}
                key={category}
                onClick={() => setFilter(category)}
                type="button"
              >
                {categoryLabel(category)}
              </button>
            ))}
          </div>
          <section className="item-grid">
            {visible.map((item) => (
              <ItemCard item={item} key={item.id} />
            ))}
          </section>
        </>
      ) : (
        <EmptyState title="Your wardrobe is empty" copy="Upload a few real clothing photos so AI can style from your wardrobe." />
      )}

      <BottomNav />
    </main>
  );
}
