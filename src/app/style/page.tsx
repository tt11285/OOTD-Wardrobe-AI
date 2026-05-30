"use client";

import { useEffect, useState } from "react";
import type { StoredClothingItem } from "@/lib/storage/repository";

// Standalone design preview for the "Editorial Atelier" direction (Phase 1).
// Everything is scoped under `.atelier`, so it does NOT change the live app.
// Uses the demo wardrobe (demo-user) so real garments show regardless of login.

function byCat(items: StoredClothingItem[], category: string, n = 1): StoredClothingItem[] {
  return items.filter((it) => it.category === category).slice(0, n);
}

export default function StylePreviewPage() {
  const [items, setItems] = useState<StoredClothingItem[]>([]);

  useEffect(() => {
    fetch("/api/items?userId=demo-user")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  const cards = [...byCat(items, "outer"), ...byCat(items, "top"), ...byCat(items, "shoes")];
  const look = [
    ...byCat(items, "top"),
    ...byCat(items, "bottom"),
    ...byCat(items, "shoes"),
    ...byCat(items, "outer"),
  ].slice(0, 4);

  return (
    <main className="atelier">
      <div className="atelier-grain" aria-hidden="true" />
      <div className="atelier-inner">
        {/* Hero */}
        <header className="at-hero at-rise" style={{ animationDelay: "0ms" }}>
          <p className="at-overline">OOTD · Design Preview</p>
          <h1 className="at-display">Editorial Atelier</h1>
          <p className="at-lede">
            A quieter, more editorial take on the wardrobe — warm paper tones, magazine
            typography, and motion that feels considered rather than busy.
          </p>
        </header>

        {/* Typography */}
        <section className="at-section at-rise" style={{ animationDelay: "60ms" }}>
          <p className="at-eyebrow">Typography</p>
          <div className="at-type-specimen">
            <span className="at-type-row" style={{ fontFamily: "var(--font-serif)", fontSize: 44, fontWeight: 500, letterSpacing: "-0.03em" }}>
              What to wear today
            </span>
            <span className="at-type-row" style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 500 }}>
              Your digital wardrobe
            </span>
            <span className="at-type-row at-overline">SECTION OVERLINE · 0.16EM</span>
            <span className="at-type-row" style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65 }}>
              Body copy in Inter — calm, readable, with generous line-height for an unhurried, premium read.
            </span>
          </div>
        </section>

        {/* Palette */}
        <section className="at-section at-rise" style={{ animationDelay: "120ms" }}>
          <p className="at-eyebrow">Palette</p>
          <div className="at-swatches">
            {[
              { name: "Cream", v: "#f9f6f2", t: "#1c1916" },
              { name: "Ink", v: "#1c1916", t: "#fff" },
              { name: "Espresso", v: "#2e2620", t: "#fff" },
              { name: "Terracotta", v: "#b07050", t: "#fff" },
              { name: "Sand line", v: "#e4dbd3", t: "#1c1916" },
            ].map((s) => (
              <div className="at-swatch" key={s.name} style={{ background: s.v, color: s.t }}>
                <span>{s.name}</span>
                <small>{s.v}</small>
              </div>
            ))}
          </div>
        </section>

        {/* Components */}
        <section className="at-section at-rise" style={{ animationDelay: "180ms" }}>
          <p className="at-eyebrow">Components</p>
          <div className="at-row">
            <button className="at-btn at-btn--primary" type="button">Wear this today</button>
            <button className="at-btn at-btn--ghost" type="button">What to wear</button>
            <button className="at-btn at-btn--danger" type="button">Delete</button>
          </div>
          <div className="at-row">
            <span className="at-chip at-chip--active">Commute</span>
            <span className="at-chip">Date</span>
            <span className="at-chip">Interview</span>
            <span className="at-badge">★ Top pick</span>
            <span className="at-badge at-badge--soft">Styling goal</span>
          </div>
        </section>

        {/* Wardrobe cards — floating garment on a soft pedestal */}
        <section className="at-section at-rise" style={{ animationDelay: "240ms" }}>
          <p className="at-eyebrow">Wardrobe cards</p>
          <div className="at-card-grid">
            {cards.map((it, i) => (
              <article className="at-card at-rise" key={it.id} style={{ animationDelay: `${260 + i * 50}ms` }}>
                <div className="at-card-img">
                  {it.imageUrl?.startsWith("http") ? <img src={it.imageUrl} alt={it.name} /> : <div className="at-card-ph" />}
                </div>
                <div className="at-card-body">
                  <p className="at-card-name">{it.name}</p>
                  <p className="at-card-meta">{[it.category, it.material].filter(Boolean).join(" · ")}</p>
                </div>
              </article>
            ))}
            {!cards.length ? <p className="at-card-meta">Loading demo wardrobe…</p> : null}
          </div>
        </section>

        {/* Outfit — editorial lookbook card */}
        <section className="at-section at-rise" style={{ animationDelay: "320ms" }}>
          <p className="at-eyebrow">Outfit · Lookbook</p>
          <article className="at-look">
            <div className="at-look-ribbon">★ Top pick</div>
            <div className="at-look-collage" data-count={look.length}>
              {look.map((it) => (
                <div className="at-look-tile" key={it.id}>
                  {it.imageUrl?.startsWith("http") ? <img src={it.imageUrl} alt={it.name} /> : <div className="at-card-ph" />}
                  <span className="at-look-label">{it.category}</span>
                </div>
              ))}
            </div>
            <div className="at-look-body">
              <p className="at-overline" style={{ color: "var(--accent)" }}>French Minimal</p>
              <h2 className="at-look-title">The off-duty editor’s uniform</h2>
              <p className="at-look-caption">
                A crisp shirt and tailored trousers softened by a camel coat — clean, sharp,
                and quietly expensive. Loafers keep it walkable.
              </p>
              <button className="at-btn at-btn--primary" type="button">Wear this today</button>
            </div>
          </article>
        </section>

        <footer className="at-foot">
          <p className="at-card-meta" style={{ textTransform: "none" }}>
            This is a preview only — the live pages are unchanged. Approve the direction and I’ll roll Phase 1 across the app.
          </p>
        </footer>
      </div>
    </main>
  );
}
