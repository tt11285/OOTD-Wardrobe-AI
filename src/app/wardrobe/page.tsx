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
  const [editing, setEditing] = useState<StoredClothingItem | null>(null);

  useEffect(() => {
    fetch(`/api/items?userId=${encodeURIComponent(userId)}`)
      .then((response) => response.json())
      .then((data) => setItems(data.items ?? []));
  }, [userId]);

  const visible = filter === "all" ? items : items.filter((item) => item.category === filter);

  function handleSaved(updated: StoredClothingItem) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setEditing(null);
  }

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
              <ItemCard item={item} key={item.id} onEdit={setEditing} />
            ))}
          </section>
        </>
      ) : (
        <EmptyState title="Your wardrobe is empty" copy="Upload a few real clothing photos so AI can style from your wardrobe." />
      )}

      {editing ? (
        <EditItemModal item={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      ) : null}

      <BottomNav />
    </main>
  );
}

// ─── Edit modal ──────────────────────────────────────────────────────────────
function EditItemModal({
  item,
  onClose,
  onSaved,
}: {
  item: StoredClothingItem;
  onClose: () => void;
  onSaved: (item: StoredClothingItem) => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<ClothingCategory>(item.category);
  const [colors, setColors] = useState(item.colors.join(", "));
  const [formality, setFormality] = useState(item.formality);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: item.userId,
          itemId: item.id,
          name,
          category,
          colors: colors.split(/[,，、]/).map((c) => c.trim()).filter(Boolean),
          formality,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSaving(false);
        setError(data.error ?? "Save failed");
        return;
      }
      onSaved(data.item);
    } catch {
      setSaving(false);
      setError("Network error, please retry");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit item">
        <h2>Edit item</h2>

        <label className="modal-field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="modal-field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as ClothingCategory)}>
            {clothingCategories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat)}
              </option>
            ))}
          </select>
        </label>

        <label className="modal-field">
          <span>Colors</span>
          <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="white, navy" />
        </label>

        <label className="modal-field">
          <span>Formality · {formality}</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={formality}
            onChange={(e) => setFormality(Number(e.target.value))}
          />
        </label>

        {error ? <p className="status-text status-error">{error}</p> : null}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
