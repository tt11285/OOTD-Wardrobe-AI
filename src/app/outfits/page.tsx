"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { OutfitCard } from "@/components/outfit-card";
import { occasionTags } from "@/lib/domain/occasion";
import { getAnonymousUserId } from "@/lib/state/user";
import type { OutfitCandidate, StoredClothingItem } from "@/lib/storage/repository";

export default function OutfitsPage() {
  const userId = useMemo(() => getAnonymousUserId(), []);
  const [occasion, setOccasion] = useState("通勤");
  const [items, setItems] = useState<StoredClothingItem[]>([]);
  const [outfits, setOutfits] = useState<OutfitCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/items?userId=${encodeURIComponent(userId)}`)
      .then((response) => response.json())
      .then((data) => setItems(data.items ?? []));
  }, [userId]);

  async function generate() {
    setIsLoading(true);
    setMessage("正在调用审美库...");
    const response = await fetch("/api/outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, occasion }),
    });
    const data = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      setMessage(`还缺少：${(data.missing ?? []).join("、")}。先补齐上衣、下装和鞋。`);
      return;
    }

    setOutfits(data.outfits ?? []);
    setItems(data.items ?? items);
    setMessage("搭好了，选一套今天就穿。");
  }

  async function accept(outfitId: string) {
    await fetch("/api/outfits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, outfitId }),
    });
    setMessage("已记录这套穿搭。");
  }

  return (
    <main className="app-page mobile-shell">
      <header className="screen-header">
        <p className="eyebrow">OOTD</p>
        <h1>今天穿什么？</h1>
        <p>用一句话描述场合，AI 会从你的真实衣橱里挑。</p>
      </header>

      <section className="occasion-panel">
        <div className="filter-row">
          {occasionTags.map((tag) => (
            <button className={occasion === tag ? "chip active" : "chip"} key={tag} onClick={() => setOccasion(tag)} type="button">
              {tag}
            </button>
          ))}
        </div>
        <input value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="比如：明天面试，要显得靠谱" />
        <button className="primary-button full-width" disabled={isLoading} onClick={generate} type="button">
          {isLoading ? "正在搭配..." : "生成搭配"}
        </button>
        {message ? <p className="status-text">{message}</p> : null}
      </section>

      {outfits.length ? (
        <section className="outfit-list">
          {outfits.map((outfit) => (
            <OutfitCard outfit={outfit} items={items} key={outfit.id} onAccept={accept} />
          ))}
        </section>
      ) : items.length ? null : (
        <EmptyState title="还没有可搭配的衣橱" copy="至少需要上衣、下装、鞋各一件，才能生成完整方案。" />
      )}

      <BottomNav />
    </main>
  );
}
