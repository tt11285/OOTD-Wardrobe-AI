"use client";

import { useEffect, useRef, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { OutfitCard } from "@/components/outfit-card";
import { ShareCard } from "@/components/share-card";
import { DressyAvatar } from "@/components/dressy-avatar";
import { DressyChat } from "@/components/dressy-chat";
import { occasionTags } from "@/lib/domain/occasion";
import { categoryLabel } from "@/lib/domain/outfits";
import { useAuth } from "@/lib/state/user";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { OutfitCandidate, StoredClothingItem } from "@/lib/storage/repository";

const loadingPhrases = ["Dressy is opening your wardrobe…", "Dressy is pulling pieces…", "Dressy is matching colors…", "Dressy is finishing the look…"];

export default function OutfitsPage() {
  const { userId } = useAuth();
  const [occasion, setOccasion] = useState("Commute");
  const [items, setItems] = useState<StoredClothingItem[]>([]);
  const [outfits, setOutfits] = useState<OutfitCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sharing, setSharing] = useState<OutfitCandidate | null>(null);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    authedFetch(`/api/items?userId=${encodeURIComponent(userId)}`)
      .then((response) => response.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setItemsLoaded(true));
  }, [userId]);

  // Cycle the "AI is working" copy so loading feels alive, not a dead spinner.
  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(() => {
      setPhraseIdx((index) => (index + 1) % loadingPhrases.length);
    }, 1100);
    return () => clearInterval(timer);
  }, [isLoading]);

  async function generate() {
    setIsLoading(true);
    setPhraseIdx(0);
    setAcceptedId(null);
    setActiveIdx(0);
    setMessage("");
    const response = await authedFetch("/api/outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, occasion }),
    });
    const data = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      setOutfits([]);
      const missing = (data.missing ?? []).map(categoryLabel).join(", ");
      setMessage(`Missing: ${missing}. Add a top, a bottom and shoes first.`);
      return;
    }

    setOutfits(data.outfits ?? []);
    setItems(data.items ?? items);
    setMessage((data.outfits ?? []).length ? "Here's what Dressy picked — swipe to browse." : "Dressy couldn't pull a look this time. Try another occasion.");
  }

  async function accept(outfitId: string) {
    setAcceptedId(outfitId);
    setMessage("Saved — enjoy your day. — Dressy");
    await authedFetch("/api/outfits", {
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

  // Top pick = the strongest WEARABLE (wardrobe) look — never an aspirational one.
  const recommendedId = (() => {
    const pool = outfits.filter((o) => o.kind !== "aspirational");
    const list = pool.length ? pool : outfits;
    return list.length ? [...list].sort((a, b) => a.rank - b.rank)[0].id : null;
  })();

  return (
    <main className="app-page mobile-shell">
      <header className="screen-header">
        <p className="eyebrow">Dressy · Styling</p>
        <h1>What to wear today?</h1>
        <p>Tell Dressy the occasion in a line — she picks from your real wardrobe.</p>
      </header>

      <section className="occasion-panel">
        <div className="filter-row">
          {occasionTags.map((tag) => (
            <button className={occasion === tag ? "chip active" : "chip"} key={tag} onClick={() => setOccasion(tag)} type="button">
              {tag}
            </button>
          ))}
        </div>
        <input value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="e.g. interview tomorrow, want to look sharp" />
        <button className="primary-button full-width" disabled={isLoading} onClick={generate} type="button">
          {isLoading ? loadingPhrases[phraseIdx] : "Generate looks"}
        </button>
        {message ? <p className="status-text">{message}</p> : null}
      </section>

      {isLoading ? (
        <div className="dressy-working" role="status">
          <DressyAvatar variant="portrait" size={44} className="dressy-working-avatar" />
          <span>{loadingPhrases[phraseIdx]}</span>
          <div className="skeleton outfit-skeleton" aria-hidden="true" />
        </div>
      ) : null}

      {!isLoading && outfits.length ? (
        <section className="outfit-result">
          <div className="outfit-result-head">
            <span>{outfits.length} looks for &ldquo;{occasion}&rdquo;</span>
            <span>{activeIdx + 1} / {outfits.length}</span>
          </div>
          <div className="outfit-carousel" ref={carouselRef} onScroll={handleCarouselScroll}>
            {outfits.map((outfit) => (
              <OutfitCard
                outfit={outfit}
                items={items}
                key={outfit.id}
                onAccept={accept}
                onShare={setSharing}
                accepted={acceptedId === outfit.id}
                recommended={outfit.id === recommendedId}
              />
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
                  aria-label={`View look ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : itemsLoaded && !isLoading && !items.length ? (
        <EmptyState title="Dressy needs a little more to work with" copy="Add at least a top, a bottom and a pair of shoes, and she'll style a full look for you." />
      ) : null}

      {sharing ? <ShareCard outfit={sharing} items={items} onClose={() => setSharing(null)} /> : null}

      <DressyChat
        userId={userId}
        occasion={occasion}
        onOutfits={(revised) => {
          setOutfits(revised);
          setAcceptedId(null);
          setActiveIdx(0);
          setMessage("Dressy restyled your looks — swipe to browse.");
          // Generate a full-body image per restyled look in the background,
          // patching each card as its image arrives. Best-effort.
          revised.forEach((o) => {
            if (o.lookImageUrl) return;
            authedFetch("/api/look-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lookId: o.id, pieces: o.pieces ?? [] }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (d.url) {
                  setOutfits((prev) => prev.map((x) => (x.id === o.id ? { ...x, lookImageUrl: d.url } : x)));
                }
              })
              .catch(() => {});
          });
        }}
      />

      <BottomNav />
    </main>
  );
}
