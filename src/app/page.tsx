"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StoredClothingItem } from "@/lib/storage/repository";

type TabKey = "OOTD" | "ADD" | "WARDROBE" | "OUTFITS";

function TabIcon({ name }: { name: TabKey }) {
  const common = {
    width: 11,
    height: 11,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "OOTD":
      return (<svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></svg>);
    case "ADD":
      return (<svg {...common}><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>);
    case "WARDROBE":
      return (<svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
    case "OUTFITS":
      return (<svg {...common}><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /></svg>);
  }
}

function PhoneTabBar({ active }: { active: TabKey }) {
  const tabs: TabKey[] = ["OOTD", "ADD", "WARDROBE", "OUTFITS"];
  return (
    <div className="phone-tabbar">
      {tabs.map((tab) => (
        <span key={tab} className={`phone-tab${active === tab ? " active" : ""}`}>
          <TabIcon name={tab} />
          {tab}
        </span>
      ))}
    </div>
  );
}

function PhoneFrame({ children, label, active }: { children: React.ReactNode; label: string; active: TabKey }) {
  return (
    <div className="phone" role="img" aria-label={`${label} screen preview`}>
      <span className="phone-notch" aria-hidden="true" />
      <div className="phone-screen">
        <div className="phone-status" aria-hidden="true">
          <span>9:41</span>
          <span className="phone-status-icons" />
        </div>
        <div className="phone-body">{children}</div>
        <PhoneTabBar active={active} />
      </div>
    </div>
  );
}

function img(item?: StoredClothingItem): string | undefined {
  return item?.imageUrl?.startsWith("http") ? item.imageUrl : undefined;
}

export default function HomePage() {
  const [items, setItems] = useState<StoredClothingItem[]>([]);

  useEffect(() => {
    fetch("/api/items?userId=demo-user")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  const first = (cat: string) => items.find((it) => it.category === cat);
  const grid = items.slice(0, 6);
  const look = [first("top"), first("bottom"), first("shoes"), first("outer")].filter(Boolean) as StoredClothingItem[];

  return (
    <main className="app-page landing">
      <div className="landing-inner">
        {/* ── Left: hero ──────────────────────────────── */}
        <section className="landing-hero">
          <p className="eyebrow">Meet Dressy</p>
          <h1>Your wardrobe, styled by Dressy.</h1>
          <p className="hero-copy">
            Dressy is your personal stylist — she learns every piece you own, then puts together
            ready-to-wear looks for whatever the day asks of you.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/upload">Start with Dressy</Link>
            <Link className="secondary-button" href="/outfits">What to wear</Link>
          </div>
        </section>

        {/* ── Right: three phones mirroring the real pages ── */}
        <section className="landing-phones" aria-label="Product flow preview">
          {/* 1 · ADD — mirrors /upload */}
          <PhoneFrame label="Add" active="ADD">
            <p className="phone-eyebrow">ADD</p>
            <h2 className="phone-title">Snap your clothes</h2>
            <div className="phone-upload">
              <span className="phone-upload-icon" aria-hidden="true">↑</span>
              Select 1–10 photos
            </div>
            <div className="phone-badges">
              <span className="phone-badge">✓ JPG</span>
              <span className="phone-badge">✓ PNG</span>
              <span className="phone-badge">✓ WebP</span>
            </div>
            <div className="phone-confirm">
              <div className="phone-confirm-img">
                {img(first("top")) ? <img src={img(first("top"))} alt="" /> : <span className="ph-fill" />}
              </div>
              <div className="phone-confirm-meta">
                <span className="phone-confirm-badge">High confidence</span>
                <span className="phone-confirm-name">{first("top")?.name ?? "White cotton shirt"}</span>
                <span className="phone-confirm-cta">Confirm</span>
              </div>
            </div>
          </PhoneFrame>

          {/* 2 · WARDROBE — mirrors /wardrobe gallery */}
          <PhoneFrame label="Wardrobe" active="WARDROBE">
            <p className="phone-eyebrow">WARDROBE</p>
            <h2 className="phone-title">Your digital wardrobe</h2>
            <div className="phone-chips">
              <span className="phone-chip active">All</span>
              <span className="phone-chip">Tops</span>
              <span className="phone-chip">Shoes</span>
            </div>
            <div className="phone-grid">
              {grid.length
                ? grid.map((it) => (
                    <span className="phone-grid-cell" key={it.id}>
                      {img(it) ? <img src={img(it)} alt="" /> : <span className="ph-fill" />}
                    </span>
                  ))
                : Array.from({ length: 6 }).map((_, i) => <span className="phone-grid-cell" key={i}><span className="ph-fill" /></span>)}
            </div>
          </PhoneFrame>

          {/* 3 · OUTFITS — mirrors /outfits lookbook */}
          <PhoneFrame label="Outfits" active="OUTFITS">
            <p className="phone-eyebrow">OUTFITS</p>
            <h2 className="phone-title">What to wear today?</h2>
            <div className="phone-outfit">
              <div className="phone-outfit-collage">
                {(look.length ? look : [undefined, undefined, undefined, undefined]).slice(0, 4).map((it, i) => (
                  <span key={it?.id ?? i}>
                    {img(it) ? <img src={img(it)} alt="" /> : <span className="ph-fill" />}
                    <i>{it?.category ?? ["top", "bottom", "shoes", "outer"][i]}</i>
                  </span>
                ))}
                <span className="phone-outfit-ribbon">★ Top pick</span>
              </div>
              <p className="phone-outfit-style">FRENCH MINIMAL</p>
              <p className="phone-outfit-reason">A crisp shirt with tailored trousers — sharp yet easy.</p>
              <div className="phone-outfit-cta">Wear this today</div>
            </div>
          </PhoneFrame>
        </section>
      </div>
    </main>
  );
}
