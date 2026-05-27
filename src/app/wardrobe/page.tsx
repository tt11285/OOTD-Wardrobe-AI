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
        <p className="eyebrow">衣橱</p>
        <h1>你的数字衣橱</h1>
        <p>{items.length ? `已入库 ${items.length} 件衣物` : "先拍几件衣服给我看看吧。"}</p>
      </header>

      {items.length ? (
        <>
          <div className="filter-row">
            <button className={filter === "all" ? "chip active" : "chip"} onClick={() => setFilter("all")} type="button">
              全部
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
        <EmptyState title="衣橱还是空的" copy="上传几张真实衣物照片，AI 才能从你的衣橱里搭配。" />
      )}

      <BottomNav />
    </main>
  );
}
