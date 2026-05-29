"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { OutfitCard } from "@/components/outfit-card";
import { occasionTags } from "@/lib/domain/occasion";
import { getAnonymousUserId } from "@/lib/state/user";
import type { OutfitCandidate, StoredClothingItem } from "@/lib/storage/repository";

const loadingPhrases = ["正在翻你的衣橱…", "正在调用审美库…", "正在搭配单品…", "正在写搭配理由…"];

export default function OutfitsPage() {
  const userId = useMemo(() => getAnonymousUserId(), []);
  const [occasion, setOccasion] = useState("通勤");
  const [items, setItems] = useState<StoredClothingItem[]>([]);
  const [outfits, setOutfits] = useState<OutfitCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/items?userId=${encodeURIComponent(userId)}`)
      .then((response) => response.json())
      .then((data) => setItems(data.items ?? []));
  }, [userId]);

  // Cycle the "AI is working" copy so loading feels alive, not a dead spinner.
  useEffect(() => {
    if (!isLoading) return;
    setPhraseIdx(0);
    const timer = setInterval(() => {
      setPhraseIdx((index) => (index + 1) % loadingPhrases.length);
    }, 1100);
    return () => clearInterval(timer);
  }, [isLoading]);

  async function generate() {
    setIsLoading(true);
    setAcceptedId(null);
    setActiveIdx(0);
    setMessage("");
    const response = await fetch("/api/outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, occasion }),
    });
    const data = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      setOutfits([]);
      setMessage(`还缺少：${(data.missing ?? []).join("、")}。先补齐上衣、下装和鞋。`);
      return;
    }

    setOutfits(data.outfits ?? []);
    setItems(data.items ?? items);
    setMessage((data.outfits ?? []).length ? "搭好了，左右滑动看不同方案。" : "暂时没搭出方案，换个场合再试试。");
  }

  async function accept(outfitId: string) {
    setAcceptedId(outfitId);
    setMessage("已记录这套穿搭，去享受今天吧。");
    await fetch("/api/outfits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, outfitId }),
    });
  }

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".outfit-card"));
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    setActiveIdx(best);
  }

  function scrollToIdx(index: number) {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelectorAll<HTMLElement>(".outfit-card")[index];
    if (!card) return;
    el.scrollTo({
      left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2,
      behavior: "smooth",
    });
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
          {isLoading ? loadingPhrases[phraseIdx] : "生成搭配"}
        </button>
        {message ? <p className="status-text">{message}</p> : null}
      </section>

      {outfits.length ? (
        <section className="outfit-result">
          <div className="outfit-result-head">
            <span>为「{occasion}」搭了 {outfits.length} 套</span>
            <span>{activeIdx + 1} / {outfits.length}</span>
          </div>
          <div className="outfit-carousel" ref={carouselRef} onScroll={handleCarouselScroll}>
            {outfits.map((outfit) => (
              <OutfitCard outfit={outfit} items={items} key={outfit.id} onAccept={accept} accepted={acceptedId === outfit.id} />
            ))}
          </div>
          {outfits.length > 1 ? (
            <div className="outfit-dots">
              {outfits.map((outfit, index) => (
                <button
                  className={index === activeIdx ? "dot active" : "dot"}
                  key={outfit.id}
                  onClick={() => scrollToIdx(index)}
                  type="button"
                  aria-label={`查看方案 ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : items.length ? null : (
        <EmptyState title="还没有可搭配的衣橱" copy="至少需要上衣、下装、鞋各一件，才能生成完整方案。" />
      )}

      <BottomNav />
    </main>
  );
}
